export const fetchChart = async (symbol, range = '5d', interval = '1d') => {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}&includePrePost=true&events=div%2Csplits`;
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 HirschCapital/1.0' } });
  if (!r.ok) return null;
  const raw = await r.json();
  const result = raw?.chart?.result?.[0];
  if (!result) return null;
  const ts = result.timestamp || [];
  const q = result.indicators?.quote?.[0] || {};
  return {
    meta: result.meta || {},
    points: ts.map((t, i) => ({ ts: t, open: q.open?.[i], high: q.high?.[i], low: q.low?.[i], close: q.close?.[i], volume: q.volume?.[i] })).filter(p => Number.isFinite(p.ts) && Number.isFinite(p.close)),
  };
};
