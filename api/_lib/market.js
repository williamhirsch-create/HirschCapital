const YF_HOSTS = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com'];
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/** Fetch from Yahoo Finance with automatic host fallback (query1 → query2) */
const yfFetch = async (path, params) => {
  const qs = new URLSearchParams(params).toString();
  let lastErr = null;
  for (const host of YF_HOSTS) {
    try {
      const url = `https://${host}${path}?${qs}`;
      const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'application/json' } });
      if (r.ok) return r;
      lastErr = new Error(`HTTP ${r.status} from ${host}`);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('All Yahoo Finance hosts failed');
};

export const fetchChart = async (symbol, range = '5d', interval = '1d') => {
  try {
    const r = await yfFetch(`/v8/finance/chart/${encodeURIComponent(symbol)}`, {
      range, interval, includePrePost: 'true', events: 'div,splits',
    });
    const raw = await r.json();
    const result = raw?.chart?.result?.[0];
    if (!result) return null;
    const ts = result.timestamp || [];
    const q = result.indicators?.quote?.[0] || {};
    return {
      meta: result.meta || {},
      points: ts.map((t, i) => ({
        ts: t,
        open: q.open?.[i],
        high: q.high?.[i],
        low: q.low?.[i],
        close: q.close?.[i],
        volume: q.volume?.[i],
      })).filter(p => Number.isFinite(p.ts) && Number.isFinite(p.close)),
    };
  } catch {
    return null;
  }
};

/** Fetch batch quotes from Yahoo Finance v7 endpoint. Returns array of quote objects or null on failure. */
export const fetchQuotes = async (symbols) => {
  try {
    const r = await yfFetch('/v7/finance/quote', {
      symbols: symbols.join(','),
      fields: [
        'symbol','regularMarketPrice','regularMarketChangePercent','regularMarketVolume',
        'regularMarketPreviousClose','regularMarketOpen','marketCap','sharesOutstanding',
        'averageDailyVolume3Month','averageDailyVolume10Day','floatShares',
        'shortPercentOfFloat','sharesShort','shortRatio',
        'preMarketVolume','preMarketPrice','preMarketChange','preMarketChangePercent',
        'fiftyTwoWeekHigh','fiftyTwoWeekLow',
        'longName','shortName','exchangeName',
      ].join(','),
    });
    const raw = await r.json();
    return raw?.quoteResponse?.result || null;
  } catch { return null; }
};

/** Compute Average True Range from OHLCV points */
export const computeATR = (points, period = 14) => {
  if (!points || points.length < 2) return 0;
  const trs = [];
  for (let i = 1; i < points.length; i++) {
    const h = points[i].high, l = points[i].low, pc = points[i - 1].close;
    if (!Number.isFinite(h) || !Number.isFinite(l) || !Number.isFinite(pc)) continue;
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  if (trs.length === 0) return 0;
  const used = trs.slice(-Math.min(period, trs.length));
  return used.reduce((a, b) => a + b, 0) / used.length;
};

/** Compute RSI from close prices */
export const computeRSI = (points, period = 14) => {
  if (!points || points.length < period + 1) return 50;
  const closes = points.map(p => p.close).filter(Number.isFinite);
  if (closes.length < period + 1) return 50;
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) avgGain += diff; else avgLoss += Math.abs(diff);
  }
  avgGain /= period;
  avgLoss /= period;
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (diff < 0 ? Math.abs(diff) : 0)) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return +(100 - 100 / (1 + rs)).toFixed(1);
};

/** Compute all live metrics from chart data and optional quote data */
export const computeMetrics = (chart, quote = null) => {
  const points = chart?.points || [];
  if (points.length < 2) return null;

  const latest = points[points.length - 1];
  const prev = points[points.length - 2];
  const price = Number(quote?.regularMarketPrice ?? latest.close);
  if (!Number.isFinite(price) || price <= 0) return null;

  // ATR%
  const atr = computeATR(points);
  const atr_pct = price > 0 ? +((atr / price) * 100).toFixed(1) : 0;

  // Relative volume: prefer Yahoo's 3-month average (most stable), then 10-day, then chart-based
  const volumes = points.map(p => p.volume).filter(Number.isFinite);
  const chartAvgVol = volumes.length > 1 ? volumes.slice(0, -1).reduce((a, b) => a + b, 0) / (volumes.length - 1) : 1;
  const avgVol = quote?.averageDailyVolume3Month || quote?.averageDailyVolume10Day || chartAvgVol;
  const todayVol = quote?.regularMarketVolume ?? latest.volume ?? 0;
  const relative_volume = avgVol > 0 ? +(todayVol / avgVol).toFixed(1) : 1;

  // Also compute 10-day relative volume for a more responsive reading
  const avgVol10d = quote?.averageDailyVolume10Day;
  const relative_volume_10d = Number.isFinite(avgVol10d) && avgVol10d > 0
    ? +(todayVol / avgVol10d).toFixed(1) : null;

  // Gap %: prefer Yahoo's regularMarketOpen (most accurate), then chart's open
  const prevClose = Number(quote?.regularMarketPreviousClose ?? prev?.close ?? price);
  const todayOpen = Number(quote?.regularMarketOpen ?? latest.open ?? price);
  const gap_pct = prevClose > 0 ? +(((todayOpen - prevClose) / prevClose) * 100).toFixed(1) : 0;

  // 5D momentum
  const fiveDayAgo = points.length >= 6 ? points[points.length - 6] : points[0];
  const momentum_5d = fiveDayAgo.close > 0 ? +(((price - fiveDayAgo.close) / fiveDayAgo.close) * 100).toFixed(1) : 0;

  // 20D momentum
  const twentyDayAgo = points.length >= 21 ? points[points.length - 21] : points[0];
  const momentum_20d = twentyDayAgo.close > 0 ? +(((price - twentyDayAgo.close) / twentyDayAgo.close) * 100).toFixed(1) : 0;

  // RSI
  const rsi = computeRSI(points);

  // Volume trend (last 5 days avg vs prior 5 days avg)
  const recentVols = volumes.slice(-5);
  const olderVols = volumes.slice(-10, -5);
  const recentAvg = recentVols.length ? recentVols.reduce((a, b) => a + b, 0) / recentVols.length : 0;
  const olderAvg = olderVols.length ? olderVols.reduce((a, b) => a + b, 0) / olderVols.length : 1;
  const volume_trend = olderAvg > 0 ? +(recentAvg / olderAvg).toFixed(1) : 1;

  // Price vs 50-day MA (if we have enough data)
  const closes = points.map(p => p.close).filter(Number.isFinite);
  const ma50 = closes.length >= 50
    ? +(closes.slice(-50).reduce((a, b) => a + b, 0) / 50).toFixed(2)
    : closes.length >= 20
      ? +(closes.slice(-20).reduce((a, b) => a + b, 0) / closes.length).toFixed(2)
      : price;
  const price_vs_ma = ma50 > 0 ? +(((price - ma50) / ma50) * 100).toFixed(1) : 0;

  // Market cap: prefer computed (shares outstanding × live price) over Yahoo's stale marketCap field
  const sharesOut = quote?.sharesOutstanding;
  const computedCap = Number.isFinite(sharesOut) && sharesOut > 0 && Number.isFinite(price) && price > 0
    ? Math.round(sharesOut * price)
    : null;
  const marketCap = computedCap || quote?.marketCap || null;

  // Change %
  const change_pct = quote?.regularMarketChangePercent
    ?? (prevClose > 0 ? +(((price - prevClose) / prevClose) * 100).toFixed(1) : 0);

  // Support/resistance from recent data
  const highs = points.slice(-20).map(p => p.high).filter(Number.isFinite);
  const lows = points.slice(-20).map(p => p.low).filter(Number.isFinite);
  const recent_high = highs.length ? +Math.max(...highs).toFixed(2) : price;
  const recent_low = lows.length ? +Math.min(...lows).toFixed(2) : price;

  // Average volume formatted
  const fmtVol = (v) => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : String(Math.round(v));

  // Float shares from Yahoo quote
  const floatShares = quote?.floatShares;
  const float_val = Number.isFinite(floatShares) && floatShares > 0
    ? (floatShares >= 1e9 ? `${(floatShares / 1e9).toFixed(1)}B` : floatShares >= 1e6 ? `${(floatShares / 1e6).toFixed(1)}M` : `${(floatShares / 1e3).toFixed(0)}K`)
    : null;

  // Short interest: prefer shortPercentOfFloat, cross-validate with sharesShort / floatShares
  let shortPct = quote?.shortPercentOfFloat;
  if ((!Number.isFinite(shortPct) || shortPct <= 0) && Number.isFinite(quote?.sharesShort) && quote.sharesShort > 0 && Number.isFinite(floatShares) && floatShares > 0) {
    shortPct = quote.sharesShort / floatShares;
  }
  const short_interest = Number.isFinite(shortPct) && shortPct > 0
    ? `${(shortPct * 100).toFixed(1)}%`
    : null;

  // Pre-market volume from Yahoo quote
  const pmVol = quote?.preMarketVolume;
  const premarket_vol = Number.isFinite(pmVol) && pmVol > 0
    ? fmtVol(pmVol)
    : null;

  return {
    price: +price.toFixed(2),
    prevClose: +prevClose.toFixed(2),
    todayOpen: +todayOpen.toFixed(2),
    change_pct: +Number(change_pct).toFixed(1),
    marketCap,
    atr_pct,
    relative_volume,
    relative_volume_10d,
    gap_pct,
    momentum_5d,
    momentum_20d,
    rsi,
    volume_trend,
    price_vs_ma,
    ma50,
    recent_high,
    recent_low,
    todayVolume: todayVol,
    avgVolume: avgVol,
    avgVolume_fmt: fmtVol(avgVol),
    todayVolume_fmt: fmtVol(todayVol),
    float_val,
    short_interest,
    premarket_vol,
    // Raw values for frontend cross-validation
    _raw_avg_volume_10d: avgVol10d || null,
    _raw_short_ratio: quote?.shortRatio || null,
  };
};
