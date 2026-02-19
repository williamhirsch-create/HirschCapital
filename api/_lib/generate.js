import { CANDIDATES, CATEGORIES, SITE_TIMEZONE, SIGNAL_LABELS, SIGNAL_WEIGHTS, ALGO_VERSION } from './constants.js';
import { fetchChart, fetchQuotes, computeMetrics } from './market.js';
import { getStore, setStore, upsertTrackRow } from './store.js';
import { previousDateKey, getNowInTzParts } from './date.js';

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

/** Compute 7 raw signal scores from live metrics, using category-specific weights */
const computeSignalScores = (m, categoryId) => {
  const weights = SIGNAL_WEIGHTS[categoryId] || [14, 14, 14, 14, 14, 15, 15];
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

/** Fetch live data and enrich candidates for a category */
const fetchAndEnrichCandidates = async (categoryId) => {
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

    const { raw, weighted, hirsch_score } = computeSignalScores(metrics, categoryId);

    enriched.push({
      ticker,
      company: quote?.longName || quote?.shortName || info.company,
      exchange: quote?.exchangeName || info.exchange,
      metrics,
      hirsch_score,
      signalScores: { raw, weighted },
    });
  }

  return enriched.sort((a, b) => b.hirsch_score - a.hirsch_score);
};

/** Select the top pick for a category using live data */
const selectTopPick = async (categoryId, dateKey, excludeTickers = new Set()) => {
  const cat = CATEGORIES.find(c => c.id === categoryId);
  const catLabel = cat?.label || categoryId;
  const enriched = (await fetchAndEnrichCandidates(categoryId))
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
    data_source: 'live',
  };
};

const buildTrackRow = async (pick, dateKey) => {
  const chart = await fetchChart(pick.ticker, '5d', '1d');
  const bar = chart?.points?.find((p) => toDate(p.ts) === dateKey) || chart?.points?.[chart.points.length - 1];
  const e = Number(bar?.open ?? chart?.meta?.chartPreviousClose ?? pick.reference_price ?? pick.price ?? 0);
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
  };
};

export const generateDailyPicks = async (dateKey, { force = false, rotate = false } = {}) => {
  const store = await getStore();
  store.daily_picks ||= {};
  store.track_record ||= [];

  // Return cached picks only if same algorithm version, picks have real data, AND not stale
  const cached = store.daily_picks[dateKey];
  const cachedHasRealData = cached && Object.values(cached.picks || {}).some(p => p.hirsch_score > 0);

  // Auto-refresh stale picks with two daily refresh gates:
  //   1) 8:30 AM ET — pre-market refresh with overnight/pre-market data
  //   2) 9:30 AM ET — market-open refresh with fresh opening-bell data
  // Also regenerate if cached picks were created on a different date than today.
  // This ensures picks always update even if the scheduled cron job fails.
  let stale = false;
  if (!force && cachedHasRealData && cached?.created_at) {
    const now = getNowInTzParts();
    const nowMins = parseInt(now.hour, 10) * 60 + parseInt(now.minute, 10);
    const todayStr = `${now.year}-${now.month}-${now.day}`;

    if (dateKey === todayStr) {
      const created = getNowInTzParts(new Date(cached.created_at));
      const createdStr = `${created.year}-${created.month}-${created.day}`;
      const createdMins = parseInt(created.hour, 10) * 60 + parseInt(created.minute, 10);

      if (createdStr !== todayStr) {
        // Picks cached under today's key but created on a different date — always stale
        stale = true;
      } else if (nowMins >= 510 && createdMins < 510) {
        // Pre-market gate: created before 8:30 AM, now past 8:30 AM
        stale = true;
      } else if (nowMins >= 570 && createdMins < 570) {
        // Market-open gate: created before 9:30 AM, now past 9:30 AM
        stale = true;
      }
    }
  }

  // Check rotation triggers BEFORE the cache return
  const versionChanged = cached?.version !== undefined && cached.version !== ALGO_VERSION;
  const oneDateOverride = dateKey === '2026-02-19' && !cached?._excluded_tickers?.length;
  const needsRotation = rotate || versionChanged || oneDateOverride;

  if (!force && !needsRotation && !stale && cached?.version === ALGO_VERSION && cachedHasRealData) return cached;

  // Build track record from previous day's picks
  const prevKey = previousDateKey(dateKey);
  const prev = store.daily_picks[prevKey];
  if (prev?.picks) {
    for (const pick of Object.values(prev.picks)) {
      const row = await buildTrackRow(pick, prevKey);
      upsertTrackRow(store.track_record, row);
    }
  }

  // Generate fresh picks using live data for all categories (no duplicates across categories)
  const picks = {};
  const usedTickers = new Set();
  const excludedTickers = new Set();
  // Exclude previously cached tickers when rotation is needed
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
  for (const c of CATEGORIES) {
    const pick = await selectTopPick(c.id, dateKey, usedTickers);
    picks[c.id] = pick;
    if (pick.ticker && pick.ticker !== 'N/A') usedTickers.add(pick.ticker);
  }

  const payload = {
    date: dateKey,
    timezone: SITE_TIMEZONE,
    picks,
    created_at: new Date().toISOString(),
    version: ALGO_VERSION,
    // Persist excluded tickers so force regenerations don't undo rotation
    ...(excludedTickers.size > 0 ? { _excluded_tickers: [...excludedTickers] } : {}),
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
  const rows = (store.track_record || [])
    .filter((r) => !category || r.category === category)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  return rows.slice(0, limit);
};
