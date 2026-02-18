const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Google Finance scraper — fetches market data from Google Finance page.
 * Falls back to Yahoo Finance if Google Finance is unavailable.
 * Returns: market_cap, avg_volume, previous_close, day_range, year_range, pe_ratio, dividend_yield, price, change_pct
 */
export default async function handler(req, res) {
  try {
    const symbol = String(req.query.symbol || '').trim().toUpperCase();
    if (!symbol) {
      return res.status(400).json({ error: 'Missing symbol query parameter.' });
    }

    // Try multiple exchange suffixes for Google Finance
    const exchanges = ['NASDAQ', 'NYSE', 'NYSEARCA', 'NYSEAMERICAN', 'BATS'];
    const exchangeHint = String(req.query.exchange || '').trim().toUpperCase();
    if (exchangeHint && !exchanges.includes(exchangeHint)) {
      exchanges.unshift(exchangeHint);
    } else if (exchangeHint) {
      // Move hint to front
      const idx = exchanges.indexOf(exchangeHint);
      if (idx > 0) { exchanges.splice(idx, 1); exchanges.unshift(exchangeHint); }
    }

    let html = null;
    let usedExchange = null;

    for (const exch of exchanges) {
      try {
        const url = `https://www.google.com/finance/quote/${encodeURIComponent(symbol)}:${exch}`;
        const r = await fetch(url, {
          headers: {
            'User-Agent': UA,
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'en-US,en;q=0.9',
          },
          redirect: 'follow',
        });
        if (r.ok) {
          const text = await r.text();
          // Check if the page has actual stock data (not a redirect or error page)
          if (text.includes('data-last-price') || text.includes('regularMarketPrice') || text.includes(symbol)) {
            html = text;
            usedExchange = exch;
            break;
          }
        }
      } catch { /* try next exchange */ }
    }

    if (!html) {
      return res.status(502).json({ error: 'Could not fetch Google Finance data for this symbol.' });
    }

    const result = { symbol, exchange: usedExchange, source: 'google_finance' };

    // Extract price from data-last-price attribute
    const priceMatch = html.match(/data-last-price="([^"]+)"/);
    if (priceMatch) {
      result.price = parseFloat(priceMatch[1]);
    }

    // Extract change percent from data-change-percent attribute (this matches the chart)
    const changePctMatch = html.match(/data-change-percent="([^"]+)"/);
    if (changePctMatch) {
      result.change_pct = +(parseFloat(changePctMatch[1]).toFixed(2));
    }

    // Extract absolute change from data-change attribute
    const changeMatch = html.match(/data-change="([^"]+)"/);
    if (changeMatch) {
      result.change = parseFloat(changeMatch[1]);
    }

    // Extract previous close from data-previous-close attribute
    const prevCloseMatch = html.match(/data-previous-close="([^"]+)"/);
    if (prevCloseMatch) {
      result.previous_close = parseFloat(prevCloseMatch[1]);
    }

    // Parse structured data from the "About" section / key stats
    // Google Finance embeds stats in a specific pattern
    const fmtVal = (v) => {
      if (!v) return null;
      v = v.trim().replace(/,/g, '');
      return v;
    };

    /** Validate that an extracted value looks like a short numeric metric (e.g. "1.3B", "32.4M", "$520K")
     *  and not a long description or HTML fragment */
    const isNumericMetric = (v) => {
      if (!v) return false;
      const s = String(v).trim();
      if (s.length > 30) return false;  // Reject long description text
      return /^[\$]?[\d,.]+\s*[BKMTX%]?[BKMTX%]?(\s*[A-Z]{3})?$/i.test(s);
    };

    /** Clean a raw metric value — strip currency suffixes like "USD", trim whitespace */
    const cleanMetric = (v) => {
      if (!v) return null;
      return v.trim().replace(/\s+(USD|EUR|GBP|JPY|CAD|AUD)$/i, '').trim();
    };

    // Extract key-value pairs from the stats section
    // Pattern: label followed by a value in subsequent elements
    const extractStat = (label) => {
      // Try multiple patterns Google Finance uses
      const patterns = [
        // Standard: >Market cap</div>...<div>2.42T USD<
        new RegExp(`>${label}</div>[^<]*<div[^>]*>([^<]+)<`, 'i'),
        // Span variant: >Market cap</span>...<span>2.42T<
        new RegExp(`>${label}</span>[^<]*<[^>]*>([^<]+)<`, 'i'),
        // Table variant
        new RegExp(`>${label}</td>[^<]*<td[^>]*>([^<]+)<`, 'i'),
        // JSON-LD or embedded data
        new RegExp(`"${label}"[^}]*"value"\\s*:\\s*"([^"]+)"`, 'i'),
        // Generic: label in any tag, value in next tag
        new RegExp(`>${label}<[^>]*>[^<]*<[^>]*>([^<]+)<`, 'i'),
        // Nested structure: label in one div, value in a deeply nested sibling
        new RegExp(`>${label}</div>(?:<[^>]*>|\\s)*?([\\$]?[\\d.,]+\\s*[BKMT]?(?:\\s*[A-Z]{3})?)\\s*<`, 'i'),
        // More aggressive: look for label text near a value
        new RegExp(`${label}[\\s\\S]{0,300}?>(\\$?[\\d.,]+\\s*[BKMT]?(?:\\s*[A-Z]{3})?)\\s*<`, 'i'),
      ];
      for (const pat of patterns) {
        const m = html.match(pat);
        if (m && m[1]) {
          const val = fmtVal(m[1]);
          // Only accept values that look like short numeric metrics, reject description text
          if (isNumericMetric(val)) return cleanMetric(val);
        }
      }
      return null;
    };

    // Market cap — try dedicated extraction first, then generic extractStat
    let mcRaw = null;

    // Google Finance often puts market cap in a specific data structure with class-based selectors
    // Try targeted patterns for market cap value near the label
    const mcPatterns = [
      /Market cap<\/div>(?:<[^>]*>|\s)*?([\d.,]+\s*[BKMT]\s*(?:USD)?)\s*</i,
      /Market cap<\/span>(?:<[^>]*>|\s)*?([\d.,]+\s*[BKMT]\s*(?:USD)?)\s*</i,
      /Market cap[\s\S]{0,500}?class="[^"]*YMlKec[^"]*"[^>]*>([\d.,]+\s*[BKMT](?:\s*USD)?)\s*</i,
      /Market cap[\s\S]{0,500}?class="[^"]*P6K39c[^"]*"[\s\S]{0,200}?([\d.,]+\s*[BKMT](?:\s*USD)?)\s*</i,
    ];
    for (const pat of mcPatterns) {
      const m = html.match(pat);
      if (m && m[1]) {
        const val = cleanMetric(fmtVal(m[1]));
        if (val && isNumericMetric(val)) { mcRaw = val; break; }
      }
    }

    // Fallback to generic extraction
    if (!mcRaw) mcRaw = extractStat('Market cap');
    if (mcRaw) result.market_cap = mcRaw;

    // Average volume — try multiple label variants used by Google Finance
    const avgVolRaw = extractStat('Avg Volume') || extractStat('Average volume') || extractStat('Avg volume');
    if (avgVolRaw) result.avg_volume = avgVolRaw;

    // Today's volume
    const volRaw = extractStat('Volume') || extractStat('Today.s volume');
    if (volRaw) result.volume = volRaw;

    // Shares outstanding (for float cross-validation and market cap computation)
    const sharesRaw = extractStat('Shares outstanding') || extractStat('Shares out');
    if (sharesRaw) result.shares_outstanding = sharesRaw;

    // Float shares
    const floatRaw = extractStat('Public float') || extractStat('Float');
    if (floatRaw) result.float_shares = floatRaw;

    // Short interest / short % of float
    const shortRaw = extractStat('Short interest') || extractStat('Short % of float');
    if (shortRaw) result.short_interest = shortRaw;

    // P/E ratio
    const peRaw = extractStat('P/E ratio');
    if (peRaw) result.pe_ratio = peRaw;

    // Dividend yield
    const divRaw = extractStat('Dividend yield');
    if (divRaw) result.dividend_yield = divRaw;

    // 52-week range
    const yrRaw = extractStat('52-wk range') || extractStat('52 week range');
    if (yrRaw) result.year_range = yrRaw;

    // 52-week high/low separately
    const w52High = extractStat('52-wk high') || extractStat('52-week high');
    if (w52High) result.week_52_high = w52High;
    const w52Low = extractStat('52-wk low') || extractStat('52-week low');
    if (w52Low) result.week_52_low = w52Low;

    // Previous close (from stats, fallback)
    if (!result.previous_close) {
      const pcRaw = extractStat('Previous close');
      if (pcRaw) result.previous_close = parseFloat(pcRaw.replace(/[,$]/g, ''));
    }

    // Open price (for gap % computation)
    const openRaw = extractStat('Open');
    if (openRaw) result.open = parseFloat(String(openRaw).replace(/[,$]/g, ''));

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected gfinance proxy error.', detail: String(err?.message || err) });
  }
}
