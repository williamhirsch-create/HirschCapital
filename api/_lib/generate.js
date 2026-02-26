import { CANDIDATES, CATEGORIES, SITE_TIMEZONE, SIGNAL_LABELS, SIGNAL_WEIGHTS, ALGO_VERSION } from './constants.js';
import { fetchChart, fetchQuotes, computeMetrics } from './market.js';
import { getStore, setStore, upsertTrackRow } from './store.js';
import { previousDateKey, getNowInTzParts } from './date.js';

/* ══════════════════════════════════════════════════════════════════
   Seeded randomness — deterministic within a time window but shifts
   at each refresh gate (8:30 / 9:30 AM) so exploration changes.
   ══════════════════════════════════════════════════════════════════ */
const simpleHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
};

const seededRandom = (seed) => ((simpleHash(seed) & 0x7fffffff) % 10000) / 10000;

/** Returns which time window we're in — changes at each refresh gate */
const getTimeWindow = () => {
  const now = getNowInTzParts();
  const mins = parseInt(now.hour, 10) * 60 + parseInt(now.minute, 10);
  if (mins < 510) return 'early';    // before 8:30 AM ET
  if (mins < 570) return 'preopen';  // 8:30–9:30 AM ET
  return 'open';                      // after 9:30 AM ET
};

/** Returns the NEXT time window (used for pre-generation before a gate) */
const getNextTimeWindow = () => {
  const now = getNowInTzParts();
  const mins = parseInt(now.hour, 10) * 60 + parseInt(now.minute, 10);
  // Within 10 minutes before 8:30 → next window is 'preopen'
  if (mins >= 500 && mins < 510) return 'preopen';
  // Within 10 minutes before 9:30 → next window is 'open'
  if (mins >= 560 && mins < 570) return 'open';
  return null; // Not near a gate
};

/* ══════════════════════════════════════════════════════════════════
   Exploration bonus — stochastic component per ticker.
   Stocks we haven't picked or that have strong track records get
   higher bonuses, injecting non-determinism into the ranking.
   ══════════════════════════════════════════════════════════════════ */
const computeExplorationBonus = (ticker, dateKey, timeWindow, tickerHistory) => {
  // Use a stronger date+ticker seed so each day produces meaningfully different rankings
  const seed = `${ticker}-${dateKey}-${timeWindow}-explore-v2`;
  const rand = seededRandom(seed);
  // Secondary seed based purely on date to add per-day variance
  const daySeed = seededRandom(`${dateKey}-daily-shuffle-${ticker}`);

  const history = tickerHistory?.[ticker];
  let explorationWeight = 0.6;
  if (history && history.picks > 0) {
    const winRate = (history.wins || 0) / history.picks;
    // Proven winners: moderate boost. Many losses: lower. Few picks: explore more.
    explorationWeight = history.picks < 3 ? 0.7 : 0.25 + winRate * 0.5;
  } else {
    explorationWeight = 0.85; // Never picked → high exploration incentive
  }

  // 0–15 Hirsch-score points, combining exploration weight with daily randomness
  // The wider range (was 0-10, now 0-15) ensures more variety across days
  const baseBonus = Math.round(rand * explorationWeight * 10);
  const dailyBonus = Math.round(daySeed * 5); // 0-5 additional daily variance
  return Math.min(15, baseBonus + dailyBonus);
};

/* ══════════════════════════════════════════════════════════════════
   Learning system — analyzes the track record to discover which
   signals predicted winners vs losers, then adjusts weights.
   ══════════════════════════════════════════════════════════════════ */

/** Analyze recent track record for one category and return per-signal
 *  weight adjustments (positive = boost, negative = reduce).
 *  Returns null if insufficient data. */
const runLearningCycle = (trackRecord, categoryId) => {
  const catRecords = trackRecord
    .filter(r => r.category === categoryId && Array.isArray(r.signal_scores) && r.signal_scores.length === 7);

  if (catRecords.length < 5) return null;

  const recent = catRecords.slice(-60);
  const winners = recent.filter(r => r.return_pct > 0);
  const losers = recent.filter(r => r.return_pct <= 0);

  if (winners.length < 2 || losers.length < 2) return null;

  const adjustments = [];
  for (let i = 0; i < 7; i++) {
    const winAvg = winners.reduce((s, r) => s + (r.signal_scores[i] || 0), 0) / winners.length;
    const loseAvg = losers.reduce((s, r) => s + (r.signal_scores[i] || 0), 0) / losers.length;

    // Positive diff → signal was higher in winners → boost its weight
    // Scale: 1.0 normalized-score gap ≈ ±6 weight points
    const diff = winAvg - loseAvg;
    adjustments.push(Math.max(-8, Math.min(8, Math.round(diff * 6))));
  }

  return adjustments;
};

/** Rebuild per-ticker statistics from the full track record */
const rebuildTickerHistory = (trackRecord) => {
  const history = {};
  for (const row of trackRecord) {
    const h = history[row.ticker] ||= { picks: 0, wins: 0, total_return: 0, last_date: null };
    if (h.last_date === row.date) continue; // dedup same date
    h.picks++;
    if (row.return_pct > 0) h.wins++;
    h.total_return = +(h.total_return + row.return_pct).toFixed(2);
    h.avg_return = +(h.total_return / h.picks).toFixed(2);
    h.last_date = row.date;
  }
  return history;
};

/* ══════════════════════════════════════════════════════════════════
   Original helpers (unchanged)
   ══════════════════════════════════════════════════════════════════ */

const toDate = (ts, tz = SITE_TIMEZONE) => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ts * 1000));

const fmtCap = (cap) => {
  if (!cap || !Number.isFinite(cap)) return 'N/A';
  if (cap >= 1e12) return `${(cap / 1e12).toFixed(2)}T`;
  if (cap >= 1e9) return `${(cap / 1e9).toFixed(1)}B`;
  return `${Math.round(cap / 1e6)}M`;
};

/** Validate a metric string is a short formatted number, not description text */
const isValidMetric = (v) => {
  if (!v || v === 'N/A') return true;
  const s = String(v).trim();
  if (s.length > 20) return false;
  return /^[\$]?[\d,.]+\s*[BKMTX%]?[BKMTX%]?$/i.test(s);
};

const fitsCategory = (metrics, cat) => {
  if (!metrics) return false;
  const price = metrics.price;
  const cap = metrics.marketCap;
  if (!Number.isFinite(price) || price <= 0) return false;
  if (cat.minPrice !== undefined && price < cat.minPrice) return false;
  if (cat.maxPrice !== undefined && price > cat.maxPrice) return false;
  if (cat.minCap !== undefined) {
    if (!Number.isFinite(cap)) return false;
    if (cap < cat.minCap) return false;
  }
  if (cat.maxCap !== undefined && Number.isFinite(cap) && cap > cat.maxCap) return false;
  return true;
};

/* ══════════════════════════════════════════════════════════════════
   Signal scoring — now accepts optional learned weight adjustments
   ═════════════════════════════════════���════════════════════════════ */

/** Compute 7 raw signal scores from live metrics.
 *  @param learnedAdj - optional array of 7 weight adjustments from the learning system */
const computeSignalScores = (m, categoryId, learnedAdj = null) => {
  const baseWeights = SIGNAL_WEIGHTS[categoryId] || [14, 14, 14, 14, 14, 15, 15];
  // Apply learned adjustments if available (clamp so no weight drops below 2)
  const weights = learnedAdj
    ? baseWeights.map((w, i) => Math.max(2, w + (learnedAdj[i] || 0)))
    : [...baseWeights];

  // Each signal produces a 0-1 normalized score, then scaled by weight
  const raw = [
    // Signal 1: ATR% (volatility) — higher = more volatile = higher score for penny, lower importance for hyper
    Math.min(1, m.atr_pct / 15),
    // Signal 2: Relative volume — higher = more unusual activity
    Math.min(1, m.relative_volume / 5),
    // Signal 3: Gap % — larger gap = stronger catalyst reaction
    Math.min(1, Math.abs(m.gap_pct) / 8),
    // Signal 4: 5D Momentum — stronger trend = higher conviction
    Math.min(1, Math.abs(m.momentum_5d) / 20),
    // Signal 5: Volume trend — accelerating volume
    Math.min(1, Math.max(0, m.volume_trend - 0.5) / 2),
    // Signal 6: RSI positioning — favor 40-70 range (not overbought, not oversold)
    m.rsi >= 40 && m.rsi <= 70 ? 0.8 : m.rsi >= 30 && m.rsi <= 80 ? 0.5 : 0.2,
    // Signal 7: Trend position (price vs MA) — above MA = bullish
    Math.min(1, Math.max(0, (m.price_vs_ma + 10) / 25)),
  ];

  const weighted = raw.map((s, i) => s * weights[i]);
  const total = weighted.reduce((a, b) => a + b, 0);
  const maxPossible = weights.reduce((a, b) => a + b, 0);
  const hirsch_score = Math.max(60, Math.min(99, Math.round((total / maxPossible) * 100)));

  return { raw, weighted, hirsch_score };
};

/** Format signal values for display */
const formatSignalValues = (m) => [
  `${m.atr_pct}%`,
  `${m.relative_volume}x`,
  `${m.gap_pct > 0 ? '+' : ''}${m.gap_pct}%`,
  `${m.momentum_5d > 0 ? '+' : ''}${m.momentum_5d}%`,
  `${m.volume_trend}x`,
  `${m.rsi}`,
  `${m.price_vs_ma > 0 ? '+' : ''}${m.price_vs_ma}%`,
];

/** Generate signal reasoning based on actual live data */
const generateSignalReasons = (m, categoryId) => {
  const atrReason = m.atr_pct >= 8 ? `ATR at ${m.atr_pct}% indicates high volatility regime — favorable for directional moves`
    : m.atr_pct >= 4 ? `ATR at ${m.atr_pct}% shows moderate volatility — typical for active swing setups`
    : `ATR at ${m.atr_pct}% reflects lower volatility — tighter risk management needed`;

  const volReason = m.relative_volume >= 3 ? `${m.relative_volume}x average volume signals unusual institutional or retail interest`
    : m.relative_volume >= 1.5 ? `${m.relative_volume}x relative volume shows above-average participation`
    : `Volume at ${m.relative_volume}x average — normal trading activity`;

  const gapReason = Math.abs(m.gap_pct) >= 3 ? `${m.gap_pct > 0 ? '+' : ''}${m.gap_pct}% gap suggests overnight catalyst absorption`
    : Math.abs(m.gap_pct) >= 1 ? `${m.gap_pct > 0 ? '+' : ''}${m.gap_pct}% gap indicates modest overnight positioning shift`
    : `Minimal gap (${m.gap_pct}%) — no significant overnight catalyst detected`;

  const momReason = Math.abs(m.momentum_5d) >= 10 ? `Strong ${m.momentum_5d > 0 ? 'bullish' : 'bearish'} 5-day momentum at ${m.momentum_5d > 0 ? '+' : ''}${m.momentum_5d}%`
    : Math.abs(m.momentum_5d) >= 3 ? `Moderate ${m.momentum_5d > 0 ? 'positive' : 'negative'} 5-day trend at ${m.momentum_5d > 0 ? '+' : ''}${m.momentum_5d}%`
    : `5-day momentum flat at ${m.momentum_5d > 0 ? '+' : ''}${m.momentum_5d}% — watch for breakout`;

  const vtReason = m.volume_trend >= 1.5 ? `Volume accelerating at ${m.volume_trend}x recent trend — building conviction`
    : m.volume_trend >= 1 ? `Volume trend stable at ${m.volume_trend}x — consistent participation`
    : `Volume declining at ${m.volume_trend}x — watch for follow-through`;

  const rsiReason = m.rsi >= 70 ? `RSI at ${m.rsi} — overbought territory, momentum strong but pullback risk elevated`
    : m.rsi >= 50 ? `RSI at ${m.rsi} — bullish momentum with room to run before overbought`
    : m.rsi >= 30 ? `RSI at ${m.rsi} — neutral to oversold, potential for mean reversion bounce`
    : `RSI at ${m.rsi} — deeply oversold, contrarian bounce setup if support holds`;

  const trendReason = m.price_vs_ma > 5 ? `Trading ${m.price_vs_ma}% above moving average — strong uptrend confirmed`
    : m.price_vs_ma > 0 ? `${m.price_vs_ma}% above moving average — mild bullish positioning`
    : m.price_vs_ma > -5 ? `${m.price_vs_ma}% below moving average — testing support zone`
    : `${m.price_vs_ma}% below moving average — downtrend, reversal needed for bullish thesis`;

  return [atrReason, volReason, gapReason, momReason, vtReason, rsiReason, trendReason];
};

/** Generate thesis text based on live metrics */
const generateThesis = (ticker, company, m, categoryId, catLabel) => {
  const bullish = m.momentum_5d > 0 || m.gap_pct > 0 || m.rsi > 50;
  const direction = bullish ? 'bullish' : 'neutral-to-bearish';
  const volDesc = m.relative_volume >= 3 ? 'significant volume surge' : m.relative_volume >= 1.5 ? 'above-average volume' : 'normal volume levels';

  const thesis_summary = [
    `${company} ranks highest in the ${catLabel} category today with a data-driven signal stack`,
    `${m.atr_pct}% ATR with ${m.relative_volume}x relative volume creates an actionable volatility setup`,
    `5-day momentum at ${m.momentum_5d > 0 ? '+' : ''}${m.momentum_5d}% and RSI at ${m.rsi} indicates ${direction} near-term positioning`,
    `Live data confirms elevated activity — risk controls and key levels must still be respected`,
  ].join('|');

  const catalysts = `${ticker} is showing ${volDesc} with ${m.relative_volume}x its average daily turnover. ` +
    `Today's ${m.gap_pct > 0 ? 'positive' : m.gap_pct < 0 ? 'negative' : 'flat'} gap of ${m.gap_pct > 0 ? '+' : ''}${m.gap_pct}% reflects overnight market positioning.\n\n` +
    `The stock has moved ${m.momentum_5d > 0 ? '+' : ''}${m.momentum_5d}% over the past 5 trading sessions ` +
    `and ${m.momentum_20d > 0 ? '+' : ''}${m.momentum_20d}% over 20 days. ` +
    `RSI at ${m.rsi} ${m.rsi > 70 ? 'suggests overbought conditions — momentum is strong but caution warranted' :
      m.rsi > 50 ? 'indicates bullish momentum with room to continue' :
      m.rsi > 30 ? 'shows neutral positioning with potential for a move in either direction' :
      'signals oversold conditions — a potential contrarian setup if support holds'}.`;

  const upside_drivers = bullish
    ? `Primary driver is continuation under the ${m.atr_pct}% ATR volatility regime with ${m.relative_volume}x volume supporting directional moves. ` +
      `A break above the recent high at $${m.recent_high} on sustained volume could trigger momentum-following algorithms and extend the move.`
    : `Setup is based on mean-reversion potential from current levels near $${m.price}. ` +
      `Volume at ${m.relative_volume}x average suggests market participants are engaged. ` +
      `A hold of the $${m.recent_low} support level could provide the base for a recovery toward $${m.ma50} (moving average).`;

  const key_levels = `Support at $${m.recent_low} (20-day low). ` +
    `Resistance at $${m.recent_high} (20-day high). ` +
    `Moving average at $${m.ma50}. ` +
    `Current price $${m.price} is ${m.price_vs_ma > 0 ? `${m.price_vs_ma}% above` : `${Math.abs(m.price_vs_ma)}% below`} the MA.`;

  const risks = [
    `Volatility risk — ${m.atr_pct}% ATR means ${categoryId === 'penny' ? 'wide intraday swings, halts, and gap risk' : 'significant price swings possible'}`,
    `Volume fade risk — if relative volume drops below 1.0x, momentum thesis weakens`,
    `${m.rsi > 70 ? 'Overbought RSI at ' + m.rsi + ' increases pullback probability' :
      m.rsi < 30 ? 'Oversold RSI at ' + m.rsi + ' — continued selling possible before reversal' :
      'Broader market reversal could override individual stock momentum'}`,
  ].join('|');

  const invalidation = [
    `Price breaks ${bullish ? 'below' : 'above'} $${bullish ? m.recent_low : m.recent_high} on heavy volume`,
    `Relative volume collapses below 0.8x average`,
    `RSI ${m.rsi > 50 ? 'drops below 40' : 'fails to recover above 50'} on closing basis`,
  ].join('|');

  return { thesis_summary, catalysts, upside_drivers, key_levels, risks, invalidation };
};

/* ══════════════════════════════════════════════════════════════════
   Candidate enrichment — now accepts learning state + exploration
   ══════════════════════════════════════════════════════════════════ */

/** Fetch live data and enrich candidates for a category.
 *  @param opts.learnedAdj   - learned weight adjustments for this category
 *  @param opts.dateKey      - current date key (for exploration seed)
 *  @param opts.timeWindow   - current time window (for exploration seed)
 *  @param opts.tickerHistory - per-ticker performance history */
const fetchAndEnrichCandidates = async (categoryId, opts = {}) => {
  const { learnedAdj, dateKey, timeWindow, tickerHistory } = opts;
  const cat = CATEGORIES.find(c => c.id === categoryId);
  const tickers = (CANDIDATES[categoryId] || []).map(c => c.ticker);
  if (!tickers.length || !cat) return [];

  // Try batch quote endpoint for market cap and real-time data
  const quotes = await fetchQuotes(tickers);
  const quoteMap = {};
  if (quotes) {
    for (const q of quotes) quoteMap[q.symbol] = q;
  }

  // Fetch 1-month daily charts for all candidates in parallel
  const chartResults = await Promise.allSettled(
    tickers.map(t => fetchChart(t, '1mo', '1d'))
  );

  const enriched = [];
  for (let i = 0; i < tickers.length; i++) {
    const ticker = tickers[i];
    const info = CANDIDATES[categoryId].find(c => c.ticker === ticker);
    const chart = chartResults[i].status === 'fulfilled' ? chartResults[i].value : null;
    if (!chart || !chart.points?.length) continue;

    const quote = quoteMap[ticker] || null;
    const metrics = computeMetrics(chart, quote);
    if (!metrics) continue;

    // Validate the ticker still fits this category
    if (!fitsCategory(metrics, cat)) continue;

    const { raw, weighted, hirsch_score } = computeSignalScores(metrics, categoryId, learnedAdj);

    // Exploration bonus: stochastic component that changes at each refresh gate
    const bonus = dateKey
      ? computeExplorationBonus(ticker, dateKey, timeWindow || 'early', tickerHistory)
      : 0;
    const adjusted_score = Math.min(99, hirsch_score + bonus);

    enriched.push({
      ticker,
      company: quote?.longName || quote?.shortName || info.company,
      exchange: quote?.exchangeName || info.exchange,
      metrics,
      hirsch_score: adjusted_score,
      base_score: hirsch_score,
      exploration_bonus: bonus,
      signalScores: { raw, weighted },
    });
  }

  return enriched.sort((a, b) => b.hirsch_score - a.hirsch_score);
};

/* ══════════════════════════════════════════════════════════════════
   Pick selection — passes learning opts through and stores signal
   scores for future learning cycles.
   ══════════════════════════════════════════════════════════════════ */

/** Select the top pick for a category using live data + learning state */
const selectTopPick = async (categoryId, dateKey, excludeTickers = new Set(), opts = {}) => {
  const cat = CATEGORIES.find(c => c.id === categoryId);
  const catLabel = cat?.label || categoryId;
  const enriched = (await fetchAndEnrichCandidates(categoryId, { ...opts, dateKey }))
    .filter(s => !excludeTickers.has(s.ticker));

  if (!enriched.length) {
    // Fallback: return a minimal placeholder if no live data available
    const fallback = CANDIDATES[categoryId]?.[0];
    return {
      ticker: fallback?.ticker || 'N/A',
      company: fallback?.company || 'Data unavailable',
      exchange: fallback?.exchange || 'N/A',
      price: 0, change_pct: 0, market_cap: 'N/A', avg_volume: 'N/A',
      relative_volume: 0, atr_pct: 0, float_val: 'N/A', short_interest: 'N/A',
      gap_pct: 0, premarket_vol: 'N/A',
      hirsch_score: 0, score: 0, date: dateKey, category: categoryId,
      thesis_summary: 'Live data unavailable — could not generate pick for this category',
      catalysts: 'Market data feed returned no results for candidates in this category.',
      upside_drivers: 'N/A', key_levels: 'N/A', risks: 'No data available', invalidation: 'N/A',
      what_it_is: fallback?.company || 'N/A',
      signal_values: 'N/A|N/A|N/A|N/A|N/A|N/A|N/A',
      signal_weights: (SIGNAL_WEIGHTS[categoryId] || []).join('|'),
      signal_reasons: 'Data unavailable|Data unavailable|Data unavailable|Data unavailable|Data unavailable|Data unavailable|Data unavailable',
      signals_json: {},
      thesis_json: { summary: '' },
      created_at: new Date().toISOString(),
      chosen_timestamp: new Date().toISOString(),
      reference_price: 0,
      _signal_scores: null,
      data_source: 'none',
    };
  }

  const winner = enriched[0];
  const m = winner.metrics;
  const weights = SIGNAL_WEIGHTS[categoryId] || [];
  const thesis = generateThesis(winner.ticker, winner.company, m, categoryId, catLabel);
  const signalValues = formatSignalValues(m);
  const signalReasons = generateSignalReasons(m, categoryId);

  // Validate formatted metric fields — reject any that are long text or non-numeric
  const capStr = fmtCap(m.marketCap);
  const avgVolStr = m.avgVolume_fmt;
  const floatStr = m.float_val || 'N/A';
  const shortStr = m.short_interest || 'N/A';
  const pmVolStr = m.premarket_vol || 'N/A';

  return {
    ticker: winner.ticker,
    company: winner.company,
    exchange: winner.exchange,
    price: m.price,
    change_pct: m.change_pct,
    market_cap: isValidMetric(capStr) ? capStr : 'N/A',
    avg_volume: isValidMetric(avgVolStr) ? avgVolStr : 'N/A',
    relative_volume: m.relative_volume,
    atr_pct: m.atr_pct,
    float_val: isValidMetric(floatStr) ? floatStr : 'N/A',
    short_interest: isValidMetric(shortStr) ? shortStr : 'N/A',
    gap_pct: m.gap_pct,
    premarket_vol: isValidMetric(pmVolStr) ? pmVolStr : 'N/A',
    hirsch_score: winner.hirsch_score,
    date: dateKey,
    category: categoryId,
    score: winner.hirsch_score,

    // Signal details (pipe-delimited for UI)
    signal_values: signalValues.join('|'),
    signal_weights: weights.join('|'),
    signal_reasons: signalReasons.join('|'),

    // Thesis
    thesis_summary: thesis.thesis_summary,
    catalysts: thesis.catalysts,
    upside_drivers: thesis.upside_drivers,
    key_levels: thesis.key_levels,
    risks: thesis.risks,
    invalidation: thesis.invalidation,
    what_it_is: winner.company,

    // Meta
    signals_json: {
      atr_pct: m.atr_pct, relative_volume: m.relative_volume,
      gap_pct: m.gap_pct, momentum_5d: m.momentum_5d,
      rsi: m.rsi, volume_trend: m.volume_trend, price_vs_ma: m.price_vs_ma,
    },
    thesis_json: { summary: thesis.thesis_summary },
    created_at: new Date().toISOString(),
    chosen_timestamp: new Date().toISOString(),
    reference_price: m.price,

    // Normalized 0-1 signal scores — stored for the learning system
    _signal_scores: winner.signalScores.raw,
    // Exploration metadata
    _base_score: winner.base_score,
    _exploration_bonus: winner.exploration_bonus,

    data_source: 'live',
  };
};

const buildTrackRow = async (pick, dateKey) => {
  const chart = await fetchChart(pick.ticker, '1mo', '1d');
  const bar = chart?.points?.find((p) => toDate(p.ts) === dateKey);
  // Prefer exact date bar's open price; fall back to pick's reference_price (price at selection time)
  // Do NOT use chartPreviousClose as it's the prior day's close, not the entry price
  const e = Number(bar?.open ?? pick.reference_price ?? pick.price ?? 0);
  const c = Number(bar?.close ?? pick.price ?? 0);
  const h = Number(bar?.high ?? c);
  const l = Number(bar?.low ?? c);
  const ret = e > 0 ? ((c - e) / e) * 100 : 0;
  const run = e > 0 ? ((h - e) / e) * 100 : 0;
  const dd = e > 0 ? ((l - e) / e) * 100 : 0;
  return {
    date: dateKey,
    category: pick.category,
    ticker: pick.ticker,
    chosen_timestamp: pick.chosen_timestamp,
    reference_price: +e.toFixed(2),
    close: +c.toFixed(2),
    high: +h.toFixed(2),
    low: +l.toFixed(2),
    return_pct: +ret.toFixed(2),
    max_run_up_pct: +run.toFixed(2),
    max_drawdown_pct: +dd.toFixed(2),
    score: pick.hirsch_score,
    // Normalized signal scores — used by the learning system to correlate signals with returns
    signal_scores: pick._signal_scores || null,
  };
};

/* ══════════════════════════════════════════════════════════════════
   Main entry point — generates daily picks with learning + exploration.

   Key changes from the deterministic version:
   1. Learning cycle: analyzes track record to adjust signal weights
      (signals correlated with winners get boosted, losers get reduced)
   2. Exploration bonus: stochastic component seeded by ticker + date +
      time window, so picks can change at each refresh gate (8:30/9:30)
   3. Stale = rotation: when staleness triggers, picks are genuinely
      re-evaluated because the time window has changed
   ══════════════════════════════════════════════════════════════════ */

export const generateDailyPicks = async (dateKey, { force = false, rotate = false, timeWindowOverride = null } = {}) => {
  const store = await getStore();
  store.daily_picks ||= {};
  store.track_record ||= [];

  // Return cached picks only if same algorithm version, picks have real data, AND not stale
  const cached = store.daily_picks[dateKey];
  const cachedHasRealData = cached && Object.values(cached.picks || {}).some(p => p.hirsch_score > 0);

  // Auto-refresh stale picks using time-window comparison.
  // If cached picks were already generated for the CURRENT time window, they're fresh.
  // This prevents double regeneration when cron pre-generates before a gate.
  let stale = false;
  if (!force && cachedHasRealData && cached?.created_at) {
    const now = getNowInTzParts();
    const nowMins = parseInt(now.hour, 10) * 60 + parseInt(now.minute, 10);
    const todayStr = `${now.year}-${now.month}-${now.day}`;
    const currentWindow = getTimeWindow();
    const cachedWindow = cached?._learning?.time_window;

    // Cached picks are for a different date than today — always stale
    if (cached.date && cached.date !== todayStr && dateKey === todayStr) {
      stale = true;
    } else if (dateKey === todayStr) {
      const created = getNowInTzParts(new Date(cached.created_at));
      const createdStr = `${created.year}-${created.month}-${created.day}`;

      if (createdStr !== todayStr) {
        // Picks cached under today's key but created on a different date — always stale
        stale = true;
      } else if (cachedWindow === currentWindow) {
        // Picks already generated for the current time window — fresh, no regeneration needed
        stale = false;
      } else if (nowMins >= 510 && cachedWindow === 'early') {
        // Pre-market gate: picks still from early window, now past 8:30 AM
        stale = true;
      } else if (nowMins >= 570 && cachedWindow !== 'open') {
        // Market-open gate: picks not from open window, now past 9:30 AM
        stale = true;
      }
    }
  }

  // Check rotation triggers BEFORE the cache return
  const versionChanged = cached?.version !== undefined && cached.version !== ALGO_VERSION;
  const needsRotation = rotate || versionChanged;

  // ── Build track record from previous day's picks ──
  // Always ensure track records are built, even when returning cached picks.
  // Build if: forced, OR no records exist yet, OR existing records have zero entry prices.
  const prevKey = previousDateKey(dateKey);
  const prev = store.daily_picks[prevKey];
  let trackRecordUpdated = false;
  if (prev?.picks) {
    const existingPrevRecords = store.track_record.filter(r => r.date === prevKey);
    const expectedCount = Object.keys(prev.picks).length;
    const hasValidRecords = existingPrevRecords.length >= expectedCount &&
      existingPrevRecords.every(r => r.reference_price > 0 && r.close > 0);
    const shouldBuild = force || !hasValidRecords;
    if (shouldBuild) {
      // Build rows individually — one failure shouldn't prevent other categories
      const results = await Promise.allSettled(
        Object.values(prev.picks).map(pick => buildTrackRow(pick, prevKey))
      );
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          upsertTrackRow(store.track_record, result.value);
          trackRecordUpdated = true;
        }
      }
    }
  }

  if (!force && !needsRotation && !stale && cached?.version === ALGO_VERSION && cachedHasRealData) {
    if (trackRecordUpdated) await setStore(store);
    return cached;
  }

  // ── Learning cycle: analyze track record and compute weight adjustments ──
  const tickerHistory = rebuildTickerHistory(store.track_record);
  const learnedWeights = {};
  for (const cat of CATEGORIES) {
    const adj = runLearningCycle(store.track_record, cat.id);
    if (adj) learnedWeights[cat.id] = adj;
  }

  // Persist learning state for transparency / debugging
  store.learning = {
    weight_adjustments: learnedWeights,
    ticker_history: tickerHistory,
    last_learned: dateKey,
  };

  // Time window — use override (for pre-generation) or current
  const timeWindow = timeWindowOverride || getTimeWindow();

  // ── Generate fresh picks using live data + learning for all categories ──
  const usedTickers = new Set();
  const excludedTickers = new Set();

  // Auto-rotate daily: exclude previous TWO trading days' picks so stocks change each day
  // Scanning 2 days back prevents the same stock appearing on consecutive days
  {
    let rotScanKey = dateKey;
    for (let i = 0; i < 2; i++) {
      const rotPrevKey = previousDateKey(rotScanKey);
      const rotPrev = store.daily_picks[rotPrevKey];
      if (rotPrev?.picks) {
        for (const p of Object.values(rotPrev.picks)) {
          if (p.ticker && p.ticker !== 'N/A') {
            usedTickers.add(p.ticker);
            excludedTickers.add(p.ticker);
          }
        }
      }
      rotScanKey = rotPrevKey;
    }
  }

  // Exclude current day's cached tickers when explicit rotation is needed (version bump or ?rotate=true)
  if (needsRotation && cached?.picks) {
    for (const p of Object.values(cached.picks)) {
      if (p.ticker && p.ticker !== 'N/A') {
        usedTickers.add(p.ticker);
        excludedTickers.add(p.ticker);
      }
    }
  } else if (cached?._excluded_tickers?.length) {
    // Sticky rotation: preserve exclusions across force regenerations for the rest of the day
    for (const t of cached._excluded_tickers) {
      usedTickers.add(t);
      excludedTickers.add(t);
    }
  }

  // ── Generate all categories in PARALLEL for speed ──
  // Each category has a distinct candidate universe so no cross-category conflicts.
  const pickResults = await Promise.allSettled(
    CATEGORIES.map(c => selectTopPick(c.id, dateKey, usedTickers, {
      learnedAdj: learnedWeights[c.id] || null,
      timeWindow,
      tickerHistory,
    }))
  );

  const picks = {};
  for (let i = 0; i < CATEGORIES.length; i++) {
    const c = CATEGORIES[i];
    if (pickResults[i].status === 'fulfilled') {
      picks[c.id] = pickResults[i].value;
      if (picks[c.id].ticker && picks[c.id].ticker !== 'N/A') {
        usedTickers.add(picks[c.id].ticker);
      }
    } else {
      // Fallback: use cached pick for this category if available
      picks[c.id] = cached?.picks?.[c.id] || {
        ticker: 'N/A', company: 'Data unavailable', hirsch_score: 0,
        category: c.id, date: dateKey, data_source: 'none',
      };
    }
  }

  const payload = {
    date: dateKey,
    timezone: SITE_TIMEZONE,
    picks,
    created_at: new Date().toISOString(),
    version: ALGO_VERSION,
    // Persist excluded tickers so force regenerations don't undo rotation
    ...(excludedTickers.size > 0 ? { _excluded_tickers: [...excludedTickers] } : {}),
    // Persist learning metadata for debugging / transparency
    _learning: {
      weight_adjustments: learnedWeights,
      time_window: timeWindow,
    },
  };
  // Only persist if at least one category has real scored data
  const hasRealData = Object.values(picks).some(p => p.hirsch_score > 0);
  if (hasRealData) {
    store.daily_picks[dateKey] = payload;
    await setStore(store);
  }
  return payload;
};

export const getTrackRecord = async (category, limit = 100) => {
  const store = await getStore();
  // Determine the current trading day so we can exclude it.
  // Today's pick performance should never appear until tomorrow's picks are generated.
  const now = getNowInTzParts();
  const todayStr = `${now.year}-${now.month}-${now.day}`;
  const rows = (store.track_record || [])
    .filter((r) => {
      if (category && r.category !== category) return false;
      // Exclude any rows for the current date — results should only appear
      // after the next day's picks are chosen (built during next-day generation)
      if (r.date === todayStr) return false;
      return true;
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  return rows.slice(0, limit);
};

/** Exported for cron pre-generation — returns the next time window if near a gate, else null */
export { getNextTimeWindow };
