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
      fields: [
        'symbol','regularMarketPrice','regularMarketChangePercent','regularMarketVolume',
        'regularMarketPreviousClose','regularMarketOpen','marketCap','sharesOutstanding',
        'averageDailyVolume3Month','averageDailyVolume10Day','floatShares',
        'shortPercentOfFloat','sharesShort','shortRatio',
        'preMarketVolume','preMarketPrice','preMarketChange','preMarketChangePercent',
        'fiftyTwoWeekHigh','fiftyTwoWeekLow',
        'longName','shortName','exchangeName',
      ].join(','),
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
    const sharesShort = q.sharesShort;
    const pmVol = q.preMarketVolume;

    // Compute market cap from shares outstanding × live price (more accurate than Yahoo's stale marketCap field)
    const sharesOut = q.sharesOutstanding;
    const livePrice = q.regularMarketPrice;
    const computedCap = Number.isFinite(sharesOut) && sharesOut > 0 && Number.isFinite(livePrice) && livePrice > 0
      ? Math.round(sharesOut * livePrice)
      : null;
    const bestCap = computedCap || q.marketCap;

    // Avg volume: prefer 3-month average, expose 10-day for relative volume computation
    const avgVol3m = q.averageDailyVolume3Month;
    const avgVol10d = q.averageDailyVolume10Day;

    // Relative volume: compute from today's volume vs 3-month average (most stable denominator)
    // Also compute against 10-day average for a more responsive reading
    const todayVol = q.regularMarketVolume;
    const relVol3m = Number.isFinite(avgVol3m) && avgVol3m > 0 && Number.isFinite(todayVol)
      ? +(todayVol / avgVol3m).toFixed(1) : null;
    const relVol10d = Number.isFinite(avgVol10d) && avgVol10d > 0 && Number.isFinite(todayVol)
      ? +(todayVol / avgVol10d).toFixed(1) : null;

    // Gap %: compute from today's open vs previous close (direct from Yahoo, most accurate)
    const mktOpen = q.regularMarketOpen;
    const prevClose = q.regularMarketPreviousClose;
    const gapPct = Number.isFinite(mktOpen) && Number.isFinite(prevClose) && prevClose > 0
      ? +(((mktOpen - prevClose) / prevClose) * 100).toFixed(1) : null;

    // Short interest: cross-validate shortPercentOfFloat with sharesShort / floatShares
    let bestShortPct = shortPct;
    if ((!Number.isFinite(bestShortPct) || bestShortPct <= 0) && Number.isFinite(sharesShort) && sharesShort > 0 && Number.isFinite(floatShares) && floatShares > 0) {
      bestShortPct = sharesShort / floatShares;
    }

    // Build response with validated numeric fields
    const capStr = fmtCap(bestCap);
    const avgVolStr = avgVol3m ? fmtVol(avgVol3m) : (avgVol10d ? fmtVol(avgVol10d) : null);
    const floatStr = Number.isFinite(floatShares) && floatShares > 0
      ? (floatShares >= 1e9 ? `${(floatShares / 1e9).toFixed(1)}B` : floatShares >= 1e6 ? `${(floatShares / 1e6).toFixed(1)}M` : `${(floatShares / 1e3).toFixed(0)}K`)
      : null;
    const shortStr = Number.isFinite(bestShortPct) && bestShortPct > 0 ? `${(bestShortPct * 100).toFixed(1)}%` : null;
    const pmVolStr = Number.isFinite(pmVol) && pmVol > 0 ? fmtVol(pmVol) : null;

    // Double-check: only include formatted values that look like valid short numeric strings
    const validMetric = (v) => v && typeof v === 'string' && v.length <= 20 && /^[\$]?[\d,.]+\s*[BKMTX%]?[BKMTX%]?$/i.test(v.trim());

    return res.status(200).json({
      symbol: q.symbol,
      price: q.regularMarketPrice,
      change_pct: q.regularMarketChangePercent != null ? +q.regularMarketChangePercent.toFixed(2) : 0,
      market_cap: validMetric(capStr) ? capStr : null,
      avg_volume: validMetric(avgVolStr) ? avgVolStr : null,
      float_val: validMetric(floatStr) ? floatStr : null,
      short_interest: validMetric(shortStr) ? shortStr : null,
      premarket_vol: validMetric(pmVolStr) ? pmVolStr : null,
      premarket_price: q.preMarketPrice || null,
      // Computed metrics from Yahoo's raw fields (more accurate than relying on pre-computed values)
      relative_volume: relVol3m,
      relative_volume_10d: relVol10d,
      gap_pct: gapPct,
      exchange: q.exchangeName || q.exchange,
      company: q.longName || q.shortName,
      // Raw numeric values for frontend metric computation and cross-validation
      _raw_market_volume: todayVol || null,
      _raw_avg_volume_3m: avgVol3m || null,
      _raw_avg_volume_10d: avgVol10d || null,
      _raw_market_cap: bestCap || null,
      _raw_market_open: mktOpen || null,
      _raw_prev_close: prevClose || null,
      _raw_float_shares: floatShares || null,
      _raw_shares_short: sharesShort || null,
      _raw_short_ratio: q.shortRatio || null,
      _raw_premarket_change_pct: q.preMarketChangePercent || null,
      _raw_52w_high: q.fiftyTwoWeekHigh || null,
      _raw_52w_low: q.fiftyTwoWeekLow || null,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected quote proxy error.', detail: String(err?.message || err) });
  }
}
