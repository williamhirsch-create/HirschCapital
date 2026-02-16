const DEFAULT_RANGE = '1mo';
const DEFAULT_INTERVAL = '1d';

export default async function handler(req, res) {
  try {
    const symbol = String(req.query.symbol || '').trim().toUpperCase();
    const range = String(req.query.range || DEFAULT_RANGE).trim();
    const interval = String(req.query.interval || DEFAULT_INTERVAL).trim();

    if (!symbol) {
      return res.status(400).json({ error: 'Missing symbol query parameter.' });
    }

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}&includePrePost=true&events=div%2Csplits`;
    const upstream = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 HirschCapital/1.0' } });
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `Upstream market API failed (${upstream.status}).` });
    }

    const raw = await upstream.json();
    const result = raw?.chart?.result?.[0];
    if (!result) {
      return res.status(502).json({ error: 'No chart result from upstream.' });
    }

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

    return res.status(200).json({
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
    return res.status(500).json({ error: 'Unexpected market proxy error.', detail: String(err?.message || err) });
  }
}
