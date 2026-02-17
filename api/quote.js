export default async function handler(req, res) {
  try {
    const symbol = String(req.query.symbol || '').trim().toUpperCase();
    if (!symbol) {
      return res.status(400).json({ error: 'Missing symbol query parameter.' });
    }

    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`;
    const upstream = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 HirschCapital/1.0' } });
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `Upstream quote API failed (${upstream.status}).` });
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
