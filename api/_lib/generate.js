import { CANDIDATES, CATEGORIES, SITE_TIMEZONE } from './constants.js';
import { fetchChart } from './market.js';
import { getStore, setStore, upsertTrackRow } from './store.js';
import { previousDateKey } from './date.js';

const toDate = (ts, tz = SITE_TIMEZONE) => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ts * 1000));

const scoreCandidate = (c) => {
  const score = (
    Math.min(25, c.atr_pct * 1.6) +
    Math.min(25, c.relative_volume * 6) +
    Math.min(15, Math.abs(c.gap_pct) * 2) +
    Math.min(15, c.short_interest * 0.8) +
    Math.min(20, Math.log10((c.marketCap || 1) + 10) * 2)
  );
  return Math.max(60, Math.min(99, Math.round(score)));
};

const selectTopPick = (categoryId, dateKey) => {
  const candidates = (CANDIDATES[categoryId] || []).map((c) => {
    const hirsch_score = scoreCandidate(c);
    return {
      ...c,
      hirsch_score,
      date: dateKey,
      category: categoryId,
      signal_values: `${c.atr_pct}%|${c.relative_volume}x|${c.gap_pct}%|${c.short_interest}%|${c.marketCap}`,
      signal_weights: '25|25|15|15|20',
      signal_reasons: 'ATR volatility regime|Relative volume expansion|Gap/catalyst reaction|Short-interest squeeze potential|Liquidity/size stability',
      thesis_summary: `${c.company} screens highest in ${categoryId}|Volatility and liquidity are elevated|Signal stack supports high-conviction pick|Risk controls still required`,
      catalysts: `${c.thesis}\n\nModel selected this candidate using current HirschScore weighting.`,
      upside_drivers: 'Primary driver is continuation under elevated volatility and volume conditions.',
      key_levels: 'Use opening range and prior day high/low as core levels.',
      risks: 'Gap fade risk|Market beta reversal|Liquidity vacuum',
      invalidation: 'Break of opening range support|Relative volume collapse',
      what_it_is: c.company,
      market_cap: c.marketCap >= 1e12 ? `${(c.marketCap / 1e12).toFixed(2)}T` : c.marketCap >= 1e9 ? `${(c.marketCap / 1e9).toFixed(1)}B` : `${Math.round(c.marketCap / 1e6)}M`,
      avg_volume: 'N/A',
      float_val: 'N/A',
      short_interest: `${c.short_interest}%`,
      premarket_vol: c.premarket_vol,
      change_pct: 0,
      score: hirsch_score,
      signals_json: { atr_pct: c.atr_pct, relative_volume: c.relative_volume, gap_pct: c.gap_pct, short_interest: c.short_interest },
      thesis_json: { summary: c.thesis },
      created_at: new Date().toISOString(),
      chosen_timestamp: new Date().toISOString(),
      reference_price: c.price,
    };
  });
  return candidates.sort((a, b) => b.hirsch_score - a.hirsch_score)[0];
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

export const generateDailyPicks = async (dateKey) => {
  const store = await getStore();
  store.daily_picks ||= {};
  store.track_record ||= [];

  if (store.daily_picks[dateKey]) return store.daily_picks[dateKey];

  const prevKey = previousDateKey(dateKey);
  const prev = store.daily_picks[prevKey];
  if (prev?.picks) {
    for (const pick of Object.values(prev.picks)) {
      const row = await buildTrackRow(pick, prevKey);
      upsertTrackRow(store.track_record, row);
    }
  }

  const picks = {};
  for (const c of CATEGORIES) picks[c.id] = selectTopPick(c.id, dateKey);

  const payload = { date: dateKey, timezone: SITE_TIMEZONE, picks, created_at: new Date().toISOString() };
  store.daily_picks[dateKey] = payload;
  await setStore(store);
  return payload;
};

export const getTrackRecord = async (category, limit = 100) => {
  const store = await getStore();
  const rows = (store.track_record || [])
    .filter((r) => !category || r.category === category)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  return rows.slice(0, limit);
};
