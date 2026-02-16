const DEFAULT_RANGE = '1mo';
const DEFAULT_INTERVAL = '1d';

export const config = {
  runtime: 'edge',
};

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8' },
});

export default async function handler(req) {
  try {
    const u = new URL(req.url);
    const symbol = (u.searchParams.get('symbol') || '').trim().toUpperCase();
    const range = (u.searchParams.get('range') || DEFAULT_RANGE).trim();
    const interval = (u.searchParams.get('interval') || DEFAULT_INTERVAL).trim();

    if (!symbol) return json({ error: 'Missing symbol query parameter.' }, 400);

    const upstreamUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}&includePrePost=true&events=div%2Csplits`;
    const upstream = await fetch(upstreamUrl, { headers: { 'User-Agent': 'Mozilla/5.0 HirschCapital/1.0' } });
    if (!upstream.ok) return json({ error: `Upstream market API failed (${upstream.status}).` }, upstream.status);

    const raw = await upstream.json();
    const result = raw?.chart?.result?.[0];
    if (!result) return json({ error: 'No chart result from upstream.' }, 502);

    const ts = result.timestamp || [];
    const quote = result.indicators?.quote?.[0] || {};
    const points = ts.map((t, i) => ({
      ts: t,
      open: quote.open?.[i],
      high: quote.high?.[i],
      low: quote.low?.[i],
      close: quote.close?.[i],
      volume: quote.volume?.[i],
    })).filter((p) => Number.isFinite(p.ts) && Number.isFinite(p.close));

    return json({
      symbol,
      range,
      interval,
      meta: {
        currency: result.meta?.currency,
        exchangeName: result.meta?.exchangeName,
        regularMarketPrice: result.meta?.regularMarketPrice,
        previousClose: result.meta?.previousClose,
        chartPreviousClose: result.meta?.chartPreviousClose,
      },
      points,
    });
  } catch (err) {
    return json({ error: 'Unexpected market proxy error.', detail: String(err?.message || err) }, 500);
  }
}
