const YF_HOSTS = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com'];
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export default async function handler(req, res) {
  try {
    const symbol = String(req.query.symbol || '').trim().toUpperCase();
    if (!symbol) {
      return res.status(400).json({ error: 'Missing symbol query parameter.' });
    }

    const qs = new URLSearchParams({
      symbols: symbol,
      fields: 'symbol,regularMarketPrice,regularMarketChangePercent,regularMarketVolume,regularMarketPreviousClose,marketCap,averageDailyVolume3Month,floatShares,shortPercentOfFloat,preMarketVolume,preMarketPrice,longName,shortName,exchangeName',
    }).toString();

    let upstream = null;
    let lastStatus = 502;
    for (const host of YF_HOSTS) {
      try {
        const r = await fetch(`https://${host}/v7/finance/quote?${qs}`, {
          headers: { 'User-Agent': UA, 'Accept': 'application/json' },
        });
        if (r.ok) { upstream = r; break; }
        lastStatus = r.status;
      } catch { /* try next host */ }
    }

    if (!upstream) {
      return res.status(lastStatus).json({ error: `Upstream quote API failed (${lastStatus}).` });
    }

    const raw = await upstream.json();
    const q = raw?.quoteResponse?.result?.[0];
    if (!q) {
      return res.status(502).json({ error: 'No quote result from upstream.' });
    }

    const fmtVol = (v) => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : String(Math.round(v));
    const fmtCap = (cap) => {
      if (!cap || !Number.isFinite(cap)) return null;
      if (cap >= 1e12) return `${(cap / 1e12).toFixed(2)}T`;
      if (cap >= 1e9) return `${(cap / 1e9).toFixed(1)}B`;
      return `${Math.round(cap / 1e6)}M`;
    };

    const floatShares = q.floatShares;
    const shortPct = q.shortPercentOfFloat;
    const pmVol = q.preMarketVolume;

    return res.status(200).json({
      symbol: q.symbol,
      price: q.regularMarketPrice,
      change_pct: q.regularMarketChangePercent != null ? +q.regularMarketChangePercent.toFixed(2) : 0,
      market_cap: fmtCap(q.marketCap),
      avg_volume: q.averageDailyVolume3Month ? fmtVol(q.averageDailyVolume3Month) : null,
      float_val: Number.isFinite(floatShares) && floatShares > 0
        ? (floatShares >= 1e9 ? `${(floatShares / 1e9).toFixed(1)}B` : floatShares >= 1e6 ? `${(floatShares / 1e6).toFixed(1)}M` : `${(floatShares / 1e3).toFixed(0)}K`)
        : null,
      short_interest: Number.isFinite(shortPct) && shortPct > 0 ? `${(shortPct * 100).toFixed(1)}%` : null,
      premarket_vol: Number.isFinite(pmVol) && pmVol > 0 ? fmtVol(pmVol) : null,
      premarket_price: q.preMarketPrice || null,
      exchange: q.exchangeName || q.exchange,
      company: q.longName || q.shortName,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected quote proxy error.', detail: String(err?.message || err) });
  }
}
