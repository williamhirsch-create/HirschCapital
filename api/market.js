const DEFAULT_RANGE = '1mo';
const DEFAULT_INTERVAL = '1d';
const YF_HOSTS = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com'];
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export default async function handler(req, res) {
  try {
    const symbol = String(req.query.symbol || '').trim().toUpperCase();
    const range = String(req.query.range || DEFAULT_RANGE).trim();
    const interval = String(req.query.interval || DEFAULT_INTERVAL).trim();

    if (!symbol) {
      return res.status(400).json({ error: 'Missing symbol query parameter.' });
    }

    const qs = new URLSearchParams({
      range, interval, includePrePost: 'true', events: 'div,splits',
    }).toString();

    let upstream = null;
    let lastStatus = 502;
    for (const host of YF_HOSTS) {
      try {
        const r = await fetch(
          `https://${host}/v8/finance/chart/${encodeURIComponent(symbol)}?${qs}`,
          { headers: { 'User-Agent': UA, 'Accept': 'application/json' } },
        );
        if (r.ok) { upstream = r; break; }
        lastStatus = r.status;
      } catch { /* try next host */ }
    }

    if (!upstream) {
      return res.status(lastStatus).json({ error: `Upstream market API failed (${lastStatus}).` });
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
