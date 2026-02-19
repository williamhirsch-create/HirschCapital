import React, { useState, useEffect, useRef, Suspense, lazy } from "react";

const PriceChart = lazy(() => import("./src/PriceChart.jsx"));

const VALID_PAGES = ["home","pick","track","method","about"];
const pageFromPath = () => {
  const p = window.location.pathname.replace(/^\/+|\/+$/g, "").toLowerCase();
  return VALID_PAGES.includes(p) ? p : "home";
};

const pctRet = (entry, exit) => {
  if (!entry || entry === 0) return 0;
  return ((exit - entry) / entry) * 100;
};

const CATS = [
  { id: "penny", label: "Penny Stocks", short: "Penny", color: "#FF4757", range: "$0.10-$5", crit: "Price < $5, micro-cap", icon: "⚡" },
  { id: "small", label: "Small Cap", short: "Small", color: "#0066FF", range: "$5-$50", crit: "$300M-$2B mkt cap", icon: "🔹" },
  { id: "mid", label: "Mid Cap", short: "Mid", color: "#8B5CF6", range: "$20-$150", crit: "$2B-$10B mkt cap", icon: "🔷" },
  { id: "large", label: "Large Cap", short: "Large", color: "#F59E0B", range: "$50-$500", crit: "$10B-$200B mkt cap", icon: "🟡" },
  { id: "hyper", label: "Hyperscalers", short: "Hyper", color: "#00C48C", range: "$100-$1000+", crit: "$200B+ tech giants", icon: "🚀" },
];

const SIGS = {
  penny: ["Volatility (ATR%)","Volume Surge","Gap Catalyst","5D Momentum","Volume Acceleration","Momentum (RSI)","Trend Position"],
  small: ["Volatility (ATR%)","Relative Volume","Gap Signal","5D Momentum","Volume Trend","RSI Divergence","Technical Setup"],
  mid: ["Volatility Profile","Volume Flow","Gap Analysis","Momentum Score","Volume Trend","RSI Position","Breakout Signal"],
  large: ["Realized Volatility","Institutional Volume","Gap Assessment","Trend Strength","Volume Profile","RSI Level","Relative Strength"],
  hyper: ["Volatility Regime","Volume Dynamics","Gap Analysis","Trend Momentum","Volume Character","RSI Assessment","Trend Confirmation"],
};

const HIST = {
  penny: [
    {d:"Feb 14",t:"NVOS",e:1.12,c:1.38,h:1.52,l:1.05,s:82},{d:"Feb 13",t:"GFAI",e:0.87,c:0.74,h:0.95,l:0.68,s:76},
    {d:"Feb 12",t:"MULN",e:0.34,c:0.52,h:0.61,l:0.31,s:88},{d:"Feb 11",t:"BBAI",e:2.15,c:2.68,h:2.89,l:2.10,s:79},
    {d:"Feb 10",t:"AEMD",e:1.45,c:1.22,h:1.58,l:1.15,s:71},{d:"Feb 7",t:"CLOV",e:0.93,c:1.18,h:1.31,l:0.88,s:84},
    {d:"Feb 6",t:"SOBR",e:0.56,c:0.48,h:0.62,l:0.44,s:68},{d:"Feb 5",t:"SNDL",e:1.88,c:2.24,h:2.45,l:1.82,s:81},
  ],
  small: [
    {d:"Feb 14",t:"UPST",e:42.10,c:47.83,h:49.20,l:41.50,s:85},{d:"Feb 13",t:"AEHR",e:18.30,c:16.90,h:19.10,l:16.40,s:72},
    {d:"Feb 12",t:"CELH",e:28.50,c:31.20,h:32.80,l:27.90,s:80},{d:"Feb 11",t:"IONQ",e:33.40,c:38.10,h:39.50,l:32.80,s:87},
    {d:"Feb 10",t:"STEM",e:8.20,c:7.60,h:8.90,l:7.30,s:69},{d:"Feb 7",t:"ASTS",e:22.10,c:25.40,h:26.80,l:21.50,s:83},
    {d:"Feb 6",t:"RKLB",e:19.80,c:21.50,h:22.30,l:19.20,s:78},{d:"Feb 5",t:"JOBY",e:7.40,c:8.10,h:8.60,l:7.10,s:74},
  ],
  mid: [
    {d:"Feb 14",t:"CRWD",e:148.20,c:156.80,h:159.40,l:147.10,s:86},{d:"Feb 13",t:"ZS",e:82.30,c:79.10,h:84.20,l:78.50,s:73},
    {d:"Feb 12",t:"DDOG",e:95.60,c:102.40,h:104.80,l:94.20,s:84},{d:"Feb 11",t:"NET",e:68.40,c:72.90,h:74.50,l:67.80,s:81},
    {d:"Feb 10",t:"SNAP",e:12.80,c:11.90,h:13.20,l:11.50,s:67},{d:"Feb 7",t:"ROKU",e:78.50,c:84.30,h:86.10,l:77.20,s:82},
    {d:"Feb 6",t:"BILL",e:55.20,c:58.90,h:60.40,l:54.50,s:79},{d:"Feb 5",t:"TWLO",e:63.80,c:67.20,h:68.90,l:62.90,s:77},
  ],
  large: [
    {d:"Feb 14",t:"AMD",e:118.50,c:126.30,h:128.90,l:117.20,s:88},{d:"Feb 13",t:"NFLX",e:542.80,c:531.20,h:548.90,l:528.40,s:74},
    {d:"Feb 12",t:"CRM",e:278.40,c:289.10,h:293.50,l:276.80,s:83},{d:"Feb 11",t:"TSLA",e:248.90,c:262.40,h:268.30,l:245.60,s:86},
    {d:"Feb 10",t:"DIS",e:98.20,c:95.80,h:99.50,l:94.90,s:70},{d:"Feb 7",t:"PYPL",e:68.90,c:73.40,h:75.20,l:68.10,s:81},
    {d:"Feb 6",t:"UBER",e:72.30,c:76.80,h:78.10,l:71.50,s:80},{d:"Feb 5",t:"SHOP",e:82.40,c:86.90,h:88.50,l:81.20,s:78},
  ],
  hyper: [
    {d:"Feb 14",t:"NVDA",e:728.50,c:756.20,h:762.80,l:724.10,s:91},{d:"Feb 13",t:"META",e:478.30,c:468.90,h:482.50,l:465.20,s:76},
    {d:"Feb 12",t:"MSFT",e:412.80,c:421.50,h:425.30,l:410.40,s:82},{d:"Feb 11",t:"GOOGL",e:148.20,c:155.80,h:157.40,l:147.50,s:85},
    {d:"Feb 10",t:"AMZN",e:178.90,c:174.50,h:180.20,l:173.20,s:72},{d:"Feb 7",t:"AAPL",e:228.40,c:235.10,h:237.60,l:227.10,s:80},
    {d:"Feb 6",t:"NVDA",e:712.30,c:738.50,h:745.20,l:708.80,s:89},{d:"Feb 5",t:"MSFT",e:405.60,c:415.20,h:418.80,l:403.90,s:81},
  ],
};

// Static reference data — shown instantly on page load, then upgraded with live data in background.
// Sources: Yahoo Finance, SEC filings, company investor relations. Values are representative snapshots.
const STATIC_PICKS = {
  penny: {
    ticker: "PLUG", company: "Plug Power Inc", exchange: "NASDAQ",
    price: 2.15, change_pct: 3.8, market_cap: "1.3B", avg_volume: "32.4M",
    relative_volume: 2.1, atr_pct: 8.4, float_val: "590.2M", short_interest: "14.8%",
    gap_pct: 2.1, premarket_vol: "3.2M", hirsch_score: 78,
    what_it_is: "Plug Power Inc is a leading provider of hydrogen fuel cell solutions for electric mobility and stationary power markets. The company designs and manufactures PEM fuel cell systems used in material handling, on-road electric vehicles, and stationary power applications across North America and Europe.",
    thesis_summary: "Plug Power ranks highest in the Penny Stocks category with strong volatility and volume signals|8.4% ATR with 2.1x relative volume creates an actionable momentum setup in the hydrogen sector|5-day momentum and RSI positioning indicate bullish near-term sentiment with continuation potential|Elevated trading activity and gap-up signal suggest institutional and retail interest convergence",
    catalysts: "PLUG is showing 2.1x its average daily volume, indicating heightened market interest in hydrogen fuel cell stocks.\n\nThe stock gapped up 2.1% from the previous close, reflecting positive overnight positioning likely tied to clean energy sector catalysts and government hydrogen infrastructure spending.",
    upside_drivers: "Primary driver is continuation under the 8.4% ATR volatility regime with 2.1x volume supporting directional moves. A break above the 20-day high on sustained volume could trigger momentum algorithms and extend the rally toward the next resistance zone.",
    key_levels: "Support at $1.82 (20-day low). Resistance at $2.48 (20-day high). Moving average at $2.05. Current price $2.15 is 4.9% above the MA.",
    risks: "Volatility risk — 8.4% ATR means wide intraday swings, potential halts, and gap risk|Volume fade risk — if relative volume drops below 1.0x, momentum thesis weakens significantly|Dilution risk — Plug Power has historically issued shares, which can pressure the stock price",
    invalidation: "Price breaks below $1.82 support on heavy volume|Relative volume collapses below 0.8x average daily turnover|RSI drops below 40 on a closing basis, indicating momentum failure",
    signal_values: "8.4%|2.1x|+2.1%|+6.8%|1.4x|56|+4.9%",
    signal_weights: "22|20|14|12|10|12|10",
    signal_reasons: "ATR at 8.4% indicates high volatility regime — favorable for directional moves in penny stocks|2.1x average volume signals above-average institutional and retail participation|+2.1% gap suggests positive overnight catalyst absorption from clean energy sector|Strong bullish 5-day momentum at +6.8% confirms short-term trend|Volume accelerating at 1.4x recent trend — building conviction for continuation|RSI at 56 — bullish momentum with room to run before overbought territory|Trading 4.9% above moving average — mild bullish positioning confirmed",
  },
  small: {
    ticker: "IONQ", company: "IonQ Inc", exchange: "NYSE",
    price: 28.50, change_pct: 4.2, market_cap: "7.4B", avg_volume: "15.8M",
    relative_volume: 2.4, atr_pct: 6.1, float_val: "168.5M", short_interest: "9.2%",
    gap_pct: 1.8, premarket_vol: "1.8M", hirsch_score: 84,
    what_it_is: "IonQ Inc is a leader in quantum computing, developing general-purpose trapped-ion quantum computers. The company's systems are available through AWS, Microsoft Azure, and Google Cloud. IonQ focuses on making quantum computing accessible for enterprise and research applications spanning optimization, simulation, and machine learning.",
    thesis_summary: "IonQ ranks highest in the Small Cap category with exceptional volume surge and momentum signals|6.1% ATR with 2.4x relative volume creates a high-conviction setup in the quantum computing space|5-day momentum at +8.2% and RSI at 62 indicates strong bullish positioning with room to continue|Accelerating institutional interest with volume trend supporting further upside potential",
    catalysts: "IONQ is trading at 2.4x its average daily volume, signaling unusual accumulation activity in the quantum computing sector.\n\nThe stock gapped up 1.8% overnight, reflecting positive market positioning ahead of quantum computing developments and government funding initiatives driving renewed sector interest.",
    upside_drivers: "Primary driver is continuation under the 6.1% ATR volatility regime with 2.4x volume supporting strong directional moves. A break above the recent 20-day high on sustained volume could trigger algorithmic momentum buying and extend the current rally.",
    key_levels: "Support at $24.80 (20-day low). Resistance at $32.40 (20-day high). Moving average at $27.10. Current price $28.50 is 5.2% above the MA.",
    risks: "Volatility risk — 6.1% ATR means significant intraday swings and gap risk are possible|Volume fade risk — if relative volume drops below 1.0x, the momentum thesis weakens|Valuation risk — quantum computing companies trade at speculative multiples with limited near-term revenue",
    invalidation: "Price breaks below $24.80 support on heavy volume|Relative volume collapses below 0.8x average daily turnover|RSI drops below 40 on a closing basis, signaling momentum failure",
    signal_values: "6.1%|2.4x|+1.8%|+8.2%|1.6x|62|+5.2%",
    signal_weights: "16|18|10|16|12|14|14",
    signal_reasons: "ATR at 6.1% shows elevated volatility — typical for active swing setups in small caps|2.4x average volume signals unusual institutional accumulation activity|+1.8% gap indicates positive overnight positioning shift from sector catalysts|Strong bullish 5-day momentum at +8.2% confirms sustained directional trend|Volume accelerating at 1.6x recent trend — building conviction among participants|RSI at 62 — bullish momentum with room to run before overbought levels|Trading 5.2% above moving average — confirmed uptrend positioning",
  },
  mid: {
    ticker: "CRWD", company: "CrowdStrike Holdings", exchange: "NASDAQ",
    price: 365.20, change_pct: 2.6, market_cap: "88.7B", avg_volume: "4.8M",
    relative_volume: 1.8, atr_pct: 3.8, float_val: "228.4M", short_interest: "3.4%",
    gap_pct: 0.9, premarket_vol: "520K", hirsch_score: 82,
    what_it_is: "CrowdStrike Holdings Inc provides cloud-delivered cybersecurity solutions through its Falcon platform. The company offers endpoint protection, threat intelligence, cloud security, and identity protection services. CrowdStrike serves enterprises and government agencies worldwide with AI-powered security.",
    thesis_summary: "CrowdStrike ranks highest in the Mid Cap category with strong technical setup and volume confirmation|3.8% ATR with 1.8x relative volume indicates institutional accumulation in cybersecurity leader|Momentum and RSI signals confirm bullish trend with breakout potential above recent resistance|Volume flow analysis shows sustained buying interest supporting the current technical setup",
    catalysts: "CRWD is trading at 1.8x average volume, indicating heightened institutional activity in the cybersecurity sector.\n\nThe stock gapped up 0.9% overnight, reflecting positive sentiment from enterprise security spending data. Cybersecurity remains a secular growth theme with increasing regulatory requirements.",
    upside_drivers: "Primary driver is the technical breakout setup with 1.8x volume confirmation. CrowdStrike's expanding platform and strong net retention rates support fundamental momentum. A break above the 20-day high could trigger institutional buying algorithms.",
    key_levels: "Support at $342.50 (20-day low). Resistance at $385.80 (20-day high). Moving average at $355.40. Current price $365.20 is 2.8% above the MA.",
    risks: "Valuation risk — cybersecurity names trade at premium multiples sensitive to growth deceleration|Competition risk — Microsoft and Palo Alto Networks continue to expand competitive offerings|Volume fade risk — if relative volume normalizes below 1.0x, breakout thesis weakens",
    invalidation: "Price breaks below $342.50 support on elevated volume|Relative volume collapses below 0.8x average|RSI drops below 40 on closing basis, indicating trend reversal",
    signal_values: "3.8%|1.8x|+0.9%|+4.5%|1.3x|58|+2.8%",
    signal_weights: "14|16|8|14|12|16|20",
    signal_reasons: "ATR at 3.8% shows moderate volatility profile — suitable for institutional swing positions|1.8x average volume confirms above-average institutional participation and flow|+0.9% gap indicates modest positive overnight positioning from sector sentiment|Moderate positive 5-day momentum at +4.5% supports continuation thesis|Volume trend stable at 1.3x — consistent participation from institutional buyers|RSI at 58 — bullish momentum with significant room before overbought territory|Trading 2.8% above moving average — mild bullish positioning within trend channel",
  },
  large: {
    ticker: "AMD", company: "Advanced Micro Devices", exchange: "NASDAQ",
    price: 119.80, change_pct: 2.2, market_cap: "192.5B", avg_volume: "42.8M",
    relative_volume: 1.6, atr_pct: 3.4, float_val: "1.6B", short_interest: "3.8%",
    gap_pct: 0.7, premarket_vol: "2.8M", hirsch_score: 85,
    what_it_is: "Advanced Micro Devices Inc designs and sells high-performance computing products including CPUs, GPUs, FPGAs, and adaptive SoC products. AMD competes with Intel in data center and PC processors and with NVIDIA in GPU accelerators. The company's EPYC server processors and Instinct AI accelerators have captured significant market share.",
    thesis_summary: "AMD ranks highest in the Large Cap category with strong institutional volume and trend confirmation|3.4% ATR with 1.6x relative volume reflects growing institutional positioning in semiconductor leader|AI accelerator demand and data center expansion provide fundamental tailwinds to technical setup|RSI and trend signals confirm bullish momentum with multiple catalysts supporting continuation",
    catalysts: "AMD is showing 1.6x its average daily volume, indicating institutional accumulation ahead of data center and AI product cycles.\n\nThe stock gapped up 0.7% from the previous close, reflecting positive semiconductor sector sentiment. AMD's Instinct MI300 AI accelerator ramp and EPYC server CPU gains continue driving analyst upgrades.",
    upside_drivers: "Primary driver is AMD's expanding AI accelerator revenue and data center market share gains. The 1.6x volume surge with 3.4% ATR supports directional moves. A break above the 20-day high could trigger institutional momentum algorithms.",
    key_levels: "Support at $110.20 (20-day low). Resistance at $128.50 (20-day high). Moving average at $116.40. Current price $119.80 is 2.9% above the MA.",
    risks: "Competition risk — NVIDIA dominates AI training GPU market, limiting AMD's addressable market capture|Cyclical risk — semiconductor stocks are sensitive to inventory cycles and demand fluctuations|Valuation risk — premium AI multiple could contract if accelerator revenue disappoints",
    invalidation: "Price breaks below $110.20 support on heavy institutional selling|Relative volume collapses below 0.8x average daily turnover|RSI drops below 40 on closing basis, indicating institutional distribution",
    signal_values: "3.4%|1.6x|+0.7%|+5.2%|1.2x|61|+2.9%",
    signal_weights: "10|14|8|16|12|18|22",
    signal_reasons: "Realized volatility at 3.4% reflects measured large-cap price action with directional potential|1.6x institutional volume confirms above-average large-cap participation and flow|+0.7% gap assessment shows modest positive overnight positioning from sector sentiment|Strong trend strength at +5.2% over 5 days confirms directional institutional buying|Volume profile stable at 1.2x — consistent institutional participation observed|RSI at 61 — bullish momentum with significant headroom before overbought conditions|Trading 2.9% above moving average — relative strength confirmed within uptrend",
  },
  hyper: {
    ticker: "NVDA", company: "NVIDIA Corporation", exchange: "NASDAQ",
    price: 138.50, change_pct: 1.9, market_cap: "3.39T", avg_volume: "195.2M",
    relative_volume: 1.4, atr_pct: 2.9, float_val: "24.3B", short_interest: "1.1%",
    gap_pct: 0.5, premarket_vol: "14.2M", hirsch_score: 89,
    what_it_is: "NVIDIA Corporation is the world's leading designer of GPUs and AI computing platforms. The company dominates the AI training and inference hardware market with data center GPU platforms including H100, H200, and Blackwell architecture. NVIDIA's CUDA ecosystem creates a deep competitive moat in the rapidly growing AI infrastructure market.",
    thesis_summary: "NVIDIA ranks highest in the Hyperscalers category with dominant trend confirmation and RSI positioning|2.9% ATR with 1.4x relative volume reflects sustained institutional accumulation in the AI infrastructure leader|AI data center demand cycle and Blackwell architecture ramp provide multi-quarter fundamental tailwinds|Trend momentum and volume dynamics confirm the strongest technical setup among mega-cap tech names",
    catalysts: "NVDA is trading at 1.4x its average daily volume, reflecting continued institutional demand for the AI infrastructure bellwether.\n\nThe stock gapped up 0.5% overnight as hyperscaler AI capex commitments accelerate. NVIDIA's Blackwell GPU ramp, record data center backlog, and expanding inference TAM drive the strongest setup in mega-cap tech.",
    upside_drivers: "Primary driver is NVIDIA's unmatched position in the AI infrastructure buildout, with hyperscaler customers committing unprecedented capex. The 1.4x volume with trend confirmation supports continued institutional accumulation. A move above the 20-day high on volume could trigger index rebalancing flows.",
    key_levels: "Support at $128.40 (20-day low). Resistance at $148.20 (20-day high). Moving average at $135.80. Current price $138.50 is 2.0% above the MA.",
    risks: "Concentration risk — revenue heavily dependent on a few hyperscaler customers|Valuation risk — trading at premium multiple that requires continued revenue acceleration|Supply chain risk — CoWoS packaging constraints could limit near-term Blackwell shipments",
    invalidation: "Price breaks below $128.40 support on elevated institutional selling volume|Relative volume collapses below 0.8x average daily turnover|RSI fails to hold above 50 on closing basis, indicating trend momentum loss",
    signal_values: "2.9%|1.4x|+0.5%|+3.8%|1.2x|64|+2.0%",
    signal_weights: "8|12|6|18|10|20|26",
    signal_reasons: "Volatility regime at 2.9% reflects measured mega-cap price action — typical for sustained trends|1.4x volume dynamics confirm steady institutional accumulation in AI sector leader|+0.5% gap reflects continued positive overnight positioning from global AI sentiment|Trend momentum at +3.8% over 5 days confirms directional buying pressure|Volume character at 1.2x — steady institutional participation without exhaustion signals|RSI at 64 — strong bullish positioning with room to continue before overbought levels|Trading 2.0% above moving average — trend confirmation is the strongest signal for hyperscalers",
  },
};

const ymd = (dt) => `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;
const US_HOLIDAYS = new Set([
  "2025-01-01","2025-01-20","2025-02-17","2025-04-18","2025-05-26","2025-06-19","2025-07-04","2025-09-01","2025-11-27","2025-12-25",
  "2026-01-01","2026-01-19","2026-02-16","2026-04-03","2026-05-25","2026-06-19","2026-07-03","2026-09-07","2026-11-26","2026-12-25",
]);
const isMktOpen = (dt) => { const day = dt.getDay(); if (day === 0 || day === 6) return false; return !US_HOLIDAYS.has(ymd(dt)); };
const mktDay = (from = new Date()) => { const dt = new Date(from); let guard = 0; while (!isMktOpen(dt) && guard++ < 10) dt.setDate(dt.getDate() - 1); return dt; };
const recentMktDays = (count, from = new Date()) => { const days = []; const cursor = mktDay(from); let guard = 0; while (days.length < count && guard++ < count + 60) { days.push(new Date(cursor)); cursor.setDate(cursor.getDate() - 1); while (!isMktOpen(cursor) && guard++ < count + 60) cursor.setDate(cursor.getDate() - 1); } return days; };
const fD = (dt) => dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
const LIVE_DAY = mktDay();
const HIST_MKT = Object.fromEntries(Object.entries(HIST).map(([id, rows]) => { const dts = recentMktDays(rows.length); return [id, rows.map((row, i) => ({ ...row, d: fD(dts[i]) }))]; }));

const gP = (b, n, v = .03) => { const d = []; let p = b; const dts = recentMktDays(n + 1).reverse(); for (let i = 0; i < dts.length; i++) { const dt = dts[i]; p = Math.max(b * .5, p + (Math.random() - .45) * v * p); d.push({ date: fD(dt), price: +p.toFixed(2), volume: Math.floor(Math.random() * 8e6 + 2e6) }); } return d; };
const gI = (o) => { const d = []; let p = o; for (let i = 0; i < 78; i++) { const h = 9 + Math.floor((i * 5 + 30) / 60), m = (i * 5 + 30) % 60; p = Math.max(o * .85, p + (Math.random() - .42) * .015 * p); d.push({ time: `${h}:${m.toString().padStart(2, "0")}`, price: +p.toFixed(2), volume: Math.floor(Math.random() * 5e5 + 1e5), vwap: +(p * (.98 + Math.random() * .04)).toFixed(2) }); } return d; };
// Pre-generate charts and status for static picks so the page renders instantly with full visuals
const INIT_CHARTS = {};
const INIT_STATUS = {};
CATS.forEach(c => {
  const bp = STATIC_PICKS[c.id].price;
  const v = c.id === "penny" ? .05 : c.id === "small" ? .035 : .02;
  INIT_CHARTS[c.id] = { "1D": gI(bp), "5D": gP(bp, 5, v), "1M": gP(bp, 30, v * .8), "6M": gP(bp, 180, v * .6), "1Y": gP(bp, 365, v * .5) };
  INIT_STATUS[c.id] = "static";
});

const getETDate = () => { try { return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" }); } catch { return ymd(new Date()); } };

/** Validate that a metric value looks like a short formatted number (e.g. "1.3B", "32.4M", "14.8%", "520K", "N/A") and not description text */
const isValidMetricValue = (v) => {
  if (v == null || v === '') return false;
  const s = String(v).trim();
  if (s === 'N/A') return true;
  // Must be short (under 20 chars) and match numeric patterns like "1.3B", "32.4M", "$520K", "14.8%", "2.1x"
  if (s.length > 20) return false;
  return /^[\$]?[\d,.]+\s*[BKMTX%]?[BKMTX%]?$/i.test(s);
};

const TF_CFG = {"1D": { range: "1d", interval: "5m" }, "5D": { range: "5d", interval: "30m" }, "1M": { range: "1mo", interval: "1d" }, "6M": { range: "6mo", interval: "1d" }, "1Y": { range: "1y", interval: "1d" }};
const fmtTime = (dt) => dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
const mktKeySet = (count = 370) => new Set(recentMktDays(count).map(ymd));

const CSS = `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap');
:root{--bg:#FAFAF8;--cd:#FFF;--dk:#0C0F14;--tx:#1A1D23;--mu:#6B7280;--ac:#0066FF;--al:#E8F0FE;--gn:#00C48C;--gl:#E6FAF3;--rd:#FF4757;--rl:#FFF0F1;--am:#F59E0B;--aml:#FEF3C7;--bd:#E8E8E4}
*{margin:0;padding:0;box-sizing:border-box}
.fs{font-family:'DM Sans',-apple-system,sans-serif}.ff{font-family:'Playfair Display',Georgia,serif}
@keyframes fu{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes si{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}
@keyframes sp{to{transform:rotate(360deg)}}
@keyframes pu{0%,100%{opacity:1}50%{opacity:.5}}
@keyframes sh{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes pbSlide{0%{background-position:200% 0}100%{background-position:-200% 0}}
.pb{background:linear-gradient(90deg,var(--ac) 0%,#4d94ff 40%,var(--ac) 80%);background-size:200% 100%;animation:pbSlide 1.8s ease infinite;border-radius:2px}
.afu{animation:fu .6s ease forwards}.asi{animation:si .5s ease forwards}
.d1{animation-delay:.1s;opacity:0}.d2{animation-delay:.2s;opacity:0}.d3{animation-delay:.3s;opacity:0}.d4{animation-delay:.4s;opacity:0}
.sk{background:linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%);background-size:200% 100%;animation:sh 1.5s infinite;border-radius:8px}
.ld{width:8px;height:8px;border-radius:50%;background:var(--gn);animation:pu 2s infinite;display:inline-block}
.ct{display:flex;gap:5px;overflow-x:auto;padding:4px;background:#F3F4F6;border-radius:14px}
.ct::-webkit-scrollbar{display:none}
.cb{padding:10px 16px;border-radius:10px;border:none;cursor:pointer;font-size:13px;font-weight:500;white-space:nowrap;transition:all .2s;display:flex;align-items:center;gap:6px;background:transparent;color:var(--mu)}
.cb.on{background:#fff;font-weight:700;box-shadow:0 2px 8px rgba(0,0,0,.06)}
@media(max-width:768px){.dn{display:none!important}.mb{display:flex!important}.mg{grid-template-columns:repeat(2,1fr)!important}}`;

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return (
      <div style={{ padding: 40, textAlign: "center", fontFamily: "'DM Sans', sans-serif" }}>
        <h2 style={{ marginBottom: 12 }}>Something went wrong</h2>
        <p style={{ color: "#6B7280", marginBottom: 20 }}>The page encountered an error. Please try refreshing.</p>
        <button onClick={() => { this.setState({ hasError: false }); window.location.reload(); }} style={{ background: "#0066FF", color: "#fff", border: "none", padding: "10px 24px", borderRadius: 8, cursor: "pointer", fontSize: 14 }}>Refresh Page</button>
      </div>
    );
    return this.props.children;
  }
}

export default function App() {
  const [pg, setPg] = useState(() => pageFromPath());
  const [ac, setAc] = useState("penny");
  const [picks, setP] = useState(STATIC_PICKS);
  const [charts, setCh] = useState(INIT_CHARTS);
  const [tf, setTf] = useState("1D");
  const [sc, setSc] = useState(false);
  const [dataStatus, setDataStatus] = useState(INIT_STATUS);
  const [mm, setMm] = useState(false);
  const [preloadReady, setPreloadReady] = useState(false);
  const [preloadProgress, setPreloadProgress] = useState({ step: "", done: 0, total: 10 });
  const [metricReady, setMetricReady] = useState({});

  useEffect(() => { const h = () => setSc(window.scrollY > 20); window.addEventListener("scroll", h); return () => window.removeEventListener("scroll", h); }, []);
  useEffect(() => { const path = pg === "home" ? "/" : `/${pg}`; if (window.location.pathname !== path) window.history.pushState(null, "", path); }, [pg]);
  useEffect(() => { const h = () => setPg(pageFromPath()); window.addEventListener("popstate", h); return () => window.removeEventListener("popstate", h); }, []);

  const [trackLive, setTrackLive] = useState({});

  const fetchMarket = async (ticker, tf = "1M") => {
    const cfg = TF_CFG[tf] || TF_CFG["1M"];
    const rs = await fetch(`/api/market?symbol=${encodeURIComponent(ticker)}&range=${cfg.range}&interval=${cfg.interval}`);
    if (!rs.ok) throw new Error(`Market fetch failed: ${rs.status}`);
    return rs.json();
  };

  const quoteCacheRef = useRef({});
  const fetchQuote = async (ticker) => {
    if (quoteCacheRef.current[ticker]) return quoteCacheRef.current[ticker];
    try {
      const rs = await fetch(`/api/quote?symbol=${encodeURIComponent(ticker)}`);
      if (!rs.ok) return null;
      const data = await rs.json();
      if (data) quoteCacheRef.current[ticker] = data;
      return data;
    } catch { return null; }
  };

  const toChartPoints = (rows) => (rows || []).map((r) => {
    const dt = new Date(r.ts * 1000);
    const price = Number(r.close ?? r.price ?? 0);
    return { time: fmtTime(dt), date: fD(dt), price, volume: Number(r.volume || 0), vwap: price };
  }).filter(r => Number.isFinite(r.price) && r.price > 0);

  /** Compute ATR from raw OHLCV points (same algorithm as backend) */
  const computeATRFromPoints = (points, period = 14) => {
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

  /** Compute live metrics from chart OHLCV data so displayed stats always match the chart */
  const computeChartMetrics = (points, metaPrice) => {
    if (!points || points.length < 2) return null;
    const latest = points[points.length - 1];
    const prev = points[points.length - 2];
    const price = Number.isFinite(metaPrice) && metaPrice > 0 ? metaPrice : Number(latest.close);
    if (!Number.isFinite(price) || price <= 0) return null;

    // ATR%
    const atr = computeATRFromPoints(points);
    const atr_pct = price > 0 ? +((atr / price) * 100).toFixed(1) : 0;

    // Relative volume (today's volume vs average of prior days)
    const volumes = points.map(p => p.volume).filter(Number.isFinite);
    const avgVol = volumes.length > 1 ? volumes.slice(0, -1).reduce((a, b) => a + b, 0) / (volumes.length - 1) : 1;
    const todayVol = latest.volume ?? 0;
    const relative_volume = avgVol > 0 ? +(todayVol / avgVol).toFixed(1) : 1;

    // Gap %
    const prevClose = Number(prev?.close ?? price);
    const todayOpen = Number(latest.open ?? price);
    const gap_pct = prevClose > 0 ? +(((todayOpen - prevClose) / prevClose) * 100).toFixed(1) : 0;

    // Formatted avg volume
    const fmtV = (val) => val >= 1e6 ? `${(val / 1e6).toFixed(1)}M` : val >= 1e3 ? `${(val / 1e3).toFixed(0)}K` : String(Math.round(val));
    const avg_volume = fmtV(avgVol);

    return { atr_pct, relative_volume, gap_pct, avg_volume };
  };

  /** Load all 5 timeframes of chart data for a single category + fetch fresh quote — all in parallel */
  const loadChartsForCategory = async (id, ticker, bp, v) => {
    try {
      const tfs = ["1D", "5D", "1M", "6M", "1Y"];
      const out = {};
      let price = null;
      let prevClose = null;
      let lastTs = null;
      let monthlyPoints = null; // raw OHLCV from the 1M chart for metric computation
      // Fetch all timeframes + a fresh quote in parallel
      const [quoteResult, ...mkResults] = await Promise.allSettled([
        fetchQuote(ticker),
        ...tfs.map(t => fetchMarket(ticker, t)),
      ]);
      const freshQuote = quoteResult.status === 'fulfilled' ? quoteResult.value : null;

      for (let i = 0; i < tfs.length; i++) {
        const t = tfs[i];
        if (mkResults[i].status !== 'fulfilled') { out[t] = []; continue; }
        const mk = mkResults[i].value;
        const pts = toChartPoints(mk.points);
        out[t] = pts;
        // Save raw 1M points for metric computation
        if (t === "1M" && mk.points?.length) monthlyPoints = mk.points;
        if (t === "1D" || !price) {
          // Prefer regularMarketPrice from meta (most current), then last chart point
          const last = mk.points?.[mk.points.length - 1];
          const metaPrice = Number(mk.meta?.regularMarketPrice);
          const lastClose = Number(last?.close);
          price = Number.isFinite(metaPrice) && metaPrice > 0 ? metaPrice : (Number.isFinite(lastClose) && lastClose > 0 ? lastClose : price);
          prevClose = Number(mk.meta?.chartPreviousClose ?? mk.meta?.previousClose ?? prevClose);
          if (last?.ts) lastTs = last.ts * 1000;
        }
      }
      const isStale = lastTs ? (Date.now() - lastTs) > 48 * 60 * 60 * 1000 : true;
      const hasData = Object.values(out).some(pts => pts.length > 0);
      const status = hasData ? (isStale ? "delayed" : "live") : "offline";

      // Build price update with all live metrics computed from chart data
      let priceUpdate = null;
      if (Number.isFinite(price) && price > 0 && Number.isFinite(prevClose) && prevClose > 0) {
        priceUpdate = { price: +price.toFixed(2), change_pct: +(((price - prevClose) / prevClose) * 100).toFixed(2) };
      }

      // Compute live metrics from monthly chart data (ATR%, relative volume, gap%)
      const chartMetrics = computeChartMetrics(monthlyPoints, price);
      if (chartMetrics && priceUpdate) {
        priceUpdate.atr_pct = chartMetrics.atr_pct;
        // Use chart-computed avg_volume as fallback
        if (!priceUpdate.avg_volume) priceUpdate.avg_volume = chartMetrics.avg_volume;

        // Gap %: prefer Yahoo's direct computation (open vs prev close), then chart-based
        if (Number.isFinite(freshQuote?.gap_pct)) {
          priceUpdate.gap_pct = freshQuote.gap_pct;
        } else {
          priceUpdate.gap_pct = chartMetrics.gap_pct;
        }

        // Relative volume: prefer Yahoo's pre-computed (3-month avg), then 10-day, then chart-based
        if (Number.isFinite(freshQuote?.relative_volume) && freshQuote.relative_volume > 0) {
          priceUpdate.relative_volume = freshQuote.relative_volume;
        } else {
          const rawAvg3m = freshQuote?._raw_avg_volume_3m;
          const rawAvg10d = freshQuote?._raw_avg_volume_10d;
          const rawTodayVol = freshQuote?._raw_market_volume;
          if (Number.isFinite(rawAvg3m) && rawAvg3m > 0 && Number.isFinite(rawTodayVol)) {
            priceUpdate.relative_volume = +(rawTodayVol / rawAvg3m).toFixed(1);
          } else if (Number.isFinite(rawAvg10d) && rawAvg10d > 0 && Number.isFinite(rawTodayVol)) {
            priceUpdate.relative_volume = +(rawTodayVol / rawAvg10d).toFixed(1);
          } else {
            priceUpdate.relative_volume = chartMetrics.relative_volume;
          }
        }
      }

      // Merge fresh quote data (market_cap, float, short interest, etc.)
      if (freshQuote && priceUpdate) {
        if (isValidMetricValue(freshQuote.market_cap)) priceUpdate.market_cap = freshQuote.market_cap;
        if (isValidMetricValue(freshQuote.avg_volume)) priceUpdate.avg_volume = freshQuote.avg_volume;
        if (isValidMetricValue(freshQuote.float_val)) priceUpdate.float_val = freshQuote.float_val;
        if (isValidMetricValue(freshQuote.short_interest)) priceUpdate.short_interest = freshQuote.short_interest;
        if (isValidMetricValue(freshQuote.premarket_vol)) priceUpdate.premarket_vol = freshQuote.premarket_vol;
        if (freshQuote.company) priceUpdate.company = freshQuote.company;
        if (freshQuote.exchange) priceUpdate.exchange = freshQuote.exchange;
      }

      return { charts: out, status, priceUpdate };
    } catch {
      return {
        charts: {"1D":gI(bp),"5D":gP(bp,5,v),"1M":gP(bp,30,v*.8),"6M":gP(bp,180,v*.6),"1Y":gP(bp,365,v*.5)},
        status: "offline",
        priceUpdate: null,
      };
    }
  };

  const loadTrackLive = async (id) => {
    if (trackLive[id]) return;
    const rows = HIST_MKT[id] || [];
    try {
      const openDays = mktKeySet(140);
      const updated = await Promise.all(rows.map(async (row, idx) => {
        const mk = await fetch(`/api/market?symbol=${encodeURIComponent(row.t)}&range=6mo&interval=1d`).then(r => r.ok ? r.json() : null);
        const daily = (mk?.points || []).filter(pt => openDays.has(ymd(new Date(pt.ts * 1000))));
        const pick = daily[Math.max(0, daily.length - 1 - idx)] || daily[daily.length - 1];
        if (!pick) return row;
        const dt = new Date(pick.ts * 1000);
        return { ...row, d: fD(dt), e: +Number(pick.open ?? pick.close).toFixed(2), c: +Number(pick.close).toFixed(2), h: +Number(pick.high ?? pick.close).toFixed(2), l: +Number(pick.low ?? pick.close).toFixed(2) };
      }));
      setTrackLive(p => ({ ...p, [id]: updated }));
    } catch {
      setTrackLive(p => ({ ...p, [id]: rows }));
    }
  };

  // Fetch all picks from the backend API (uses live market data)
  const apiPicksRef = useRef(null);
  const fetchApiPicks = async ({ force = false } = {}) => {
    if (!force && apiPicksRef.current) return apiPicksRef.current;
    try {
      const url = force ? "/api/today?force=true" : "/api/today";
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) return null;
      const data = await r.json();
      // Only cache if picks have real scored data
      const hasRealData = Object.values(data?.picks || {}).some(p => p.hirsch_score > 0);
      if (hasRealData) apiPicksRef.current = data;
      return data;
    } catch { return null; }
  };

  /** Validate that a pick has all critical fields filled with real data */
  const validatePick = (pick) => {
    if (!pick || !pick.ticker || pick.ticker === "N/A") return false;
    if (!pick.company) return false;
    if (!Number.isFinite(pick.price) || pick.price <= 0) return false;
    if (!pick.hirsch_score || pick.hirsch_score <= 0) return false;
    if (!pick.thesis_summary || pick.thesis_summary.includes("Loading")) return false;
    if (!pick.signal_values || pick.signal_values.includes("...")) return false;
    return true;
  };

  /** Fetch Google Finance data for a ticker (cached to avoid redundant requests) */
  const gfCacheRef = useRef({});
  const fetchGFinance = async (ticker, exchange) => {
    const key = `${ticker}_${exchange||''}`;
    if (gfCacheRef.current[key]) return gfCacheRef.current[key];
    try {
      let url = `/api/gfinance?symbol=${encodeURIComponent(ticker)}`;
      if (exchange) url += `&exchange=${encodeURIComponent(exchange)}`;
      const rs = await fetch(url);
      if (!rs.ok) return null;
      const data = await rs.json();
      if (data) gfCacheRef.current[key] = data;
      return data;
    } catch { return null; }
  };

  /** Enrich a pick with live data from Yahoo quote + Google Finance — always refreshes ALL fields.
   *  Validates that metric values are proper short formatted numbers before accepting them. */
  const enrichPickWithQuote = async (pick) => {
    if (!pick?.ticker || pick.ticker === "N/A") return pick;
    // Fetch from both Yahoo quote and Google Finance in parallel
    const [q, gf] = await Promise.all([
      fetchQuote(pick.ticker),
      fetchGFinance(pick.ticker, pick.exchange),
    ]);
    const enriched = { ...pick };

    // Google Finance is the preferred source for price/change (matches chart)
    if (gf && Number.isFinite(gf.price) && gf.price > 0) {
      enriched.price = +gf.price.toFixed(2);
      if (Number.isFinite(gf.change_pct)) enriched.change_pct = gf.change_pct;
    } else if (q && Number.isFinite(q.price) && q.price > 0) {
      enriched.price = +q.price.toFixed(2);
      enriched.change_pct = q.change_pct ?? enriched.change_pct;
    }

    // Market cap: prefer Google Finance, fall back to Yahoo (now computed from shares outstanding × price)
    if (isValidMetricValue(gf?.market_cap)) enriched.market_cap = gf.market_cap;
    else if (isValidMetricValue(q?.market_cap)) enriched.market_cap = q.market_cap;

    // Avg volume: prefer Google Finance, fall back to Yahoo — only accept valid short numeric strings
    if (isValidMetricValue(gf?.avg_volume)) enriched.avg_volume = gf.avg_volume;
    else if (isValidMetricValue(q?.avg_volume)) enriched.avg_volume = q.avg_volume;

    // Float: prefer Yahoo (most reliable), cross-validate with Google Finance if available
    if (isValidMetricValue(q?.float_val)) enriched.float_val = q.float_val;
    else if (isValidMetricValue(gf?.float_shares)) enriched.float_val = gf.float_shares;

    // Short interest: Yahoo is the primary source; Google Finance may provide a fallback
    if (isValidMetricValue(q?.short_interest)) enriched.short_interest = q.short_interest;
    else if (isValidMetricValue(gf?.short_interest)) enriched.short_interest = gf.short_interest;

    // Pre-market volume: only from Yahoo
    if (isValidMetricValue(q?.premarket_vol)) enriched.premarket_vol = q.premarket_vol;

    // Relative volume: use Yahoo's pre-computed value (today's volume / 3-month avg)
    if (Number.isFinite(q?.relative_volume) && q.relative_volume > 0) {
      enriched.relative_volume = q.relative_volume;
    }

    // Gap %: prefer Yahoo's direct computation (regularMarketOpen vs previousClose)
    if (Number.isFinite(q?.gap_pct)) {
      enriched.gap_pct = q.gap_pct;
    } else if (gf?.open && gf?.previous_close && gf.previous_close > 0) {
      enriched.gap_pct = +(((gf.open - gf.previous_close) / gf.previous_close) * 100).toFixed(1);
    }

    if (q?.exchange) enriched.exchange = q.exchange;
    if (q?.company) enriched.company = q.company;

    // Store raw values for chart-based cross-validation
    if (gf?.previous_close && Number.isFinite(gf.previous_close) && gf.previous_close > 0) {
      enriched._prevClose = gf.previous_close;
    }
    if (q?._raw_prev_close && Number.isFinite(q._raw_prev_close) && q._raw_prev_close > 0) {
      enriched._prevClose = enriched._prevClose || q._raw_prev_close;
    }

    return enriched;
  };

  /** Master preload: fetch all picks, enrich + load charts per category, update UI as each completes */
  const preloadAllData = async () => {
    const catIds = CATS.map(c => c.id);
    // Prioritize the currently active category so it gets live data first
    const sortedIds = [ac, ...catIds.filter(id => id !== ac)];
    const totalSteps = 1 + sortedIds.length * 2; // api + (enrich + charts) per category
    let done = 0;
    const progress = (step) => { done++; setPreloadProgress({ step, done, total: totalSteps }); };

    // Step 1: Fetch all picks from the backend API
    setPreloadProgress({ step: "Fetching live picks from algorithm...", done: 0, total: totalSteps });
    let apiData = await fetchApiPicks();

    // If picks came back without real data, force a fresh regeneration
    const picksHaveRealData = Object.values(apiData?.picks || {}).some(p => p.hirsch_score > 0);
    if (!picksHaveRealData && apiData) {
      setPreloadProgress({ step: "Regenerating picks with fresh live data...", done: 0, total: totalSteps });
      const retryData = await fetchApiPicks({ force: true });
      if (retryData) apiData = retryData;
    }
    progress("Picks loaded");

    // Step 2: For each category (active first), enrich + load charts, then update UI immediately
    const enrichedPicks = {};

    const processCategory = async (id) => {
      let pick = apiData?.picks?.[id] || STATIC_PICKS[id];
      pick = await enrichPickWithQuote(pick);

      // Validate metric fields
      for (const field of ['market_cap', 'avg_volume', 'float_val', 'short_interest', 'premarket_vol']) {
        if (!isValidMetricValue(pick[field])) pick[field] = 'N/A';
      }
      for (const field of ['relative_volume', 'atr_pct', 'gap_pct']) {
        if (!Number.isFinite(pick[field])) pick[field] = 0;
      }
      enrichedPicks[id] = pick;

      // Wave 1: Mark quote-sourced metrics as ready and update UI immediately
      const ready = new Set();
      if (isValidMetricValue(pick.market_cap) && pick.market_cap !== 'N/A') ready.add('market_cap');
      if (isValidMetricValue(pick.avg_volume) && pick.avg_volume !== 'N/A') ready.add('avg_volume');
      if (isValidMetricValue(pick.float_val) && pick.float_val !== 'N/A') ready.add('float_val');
      if (isValidMetricValue(pick.short_interest) && pick.short_interest !== 'N/A') ready.add('short_interest');
      if (isValidMetricValue(pick.premarket_vol) && pick.premarket_vol !== 'N/A') ready.add('premarket_vol');
      setMetricReady(prev => ({ ...prev, [id]: new Set(ready) }));
      setP(prev => ({ ...prev, [id]: enrichedPicks[id] }));
      progress(`${pick.ticker} quote loaded`);

      // Load charts (quote is already cached from enrichment, so no redundant fetch)
      const ticker = pick?.ticker || STATIC_PICKS[id].ticker;
      const bp = id==="penny"?1+Math.random()*3:id==="small"?10+Math.random()*35:id==="mid"?40+Math.random()*100:id==="large"?80+Math.random()*300:150+Math.random()*600;
      const v = id==="penny"?.05:id==="small"?.035:.02;
      const result = await loadChartsForCategory(id, ticker, bp, v);

      // Merge chart-computed metrics
      if (result.priceUpdate && Number.isFinite(result.priceUpdate.price) && result.priceUpdate.price > 0) {
        enrichedPicks[id] = { ...enrichedPicks[id], ...result.priceUpdate };
      }

      // Wave 2: Mark chart-computed metrics as ready
      if (Number.isFinite(enrichedPicks[id].atr_pct)) ready.add('atr_pct');
      if (Number.isFinite(enrichedPicks[id].relative_volume)) ready.add('relative_volume');
      if (Number.isFinite(enrichedPicks[id].gap_pct)) ready.add('gap_pct');
      // Re-check quote fields that may have been updated by chart data
      if (isValidMetricValue(enrichedPicks[id].market_cap) && enrichedPicks[id].market_cap !== 'N/A') ready.add('market_cap');
      if (isValidMetricValue(enrichedPicks[id].avg_volume) && enrichedPicks[id].avg_volume !== 'N/A') ready.add('avg_volume');
      if (isValidMetricValue(enrichedPicks[id].float_val) && enrichedPicks[id].float_val !== 'N/A') ready.add('float_val');
      if (isValidMetricValue(enrichedPicks[id].short_interest) && enrichedPicks[id].short_interest !== 'N/A') ready.add('short_interest');
      if (isValidMetricValue(enrichedPicks[id].premarket_vol) && enrichedPicks[id].premarket_vol !== 'N/A') ready.add('premarket_vol');
      setMetricReady(prev => ({ ...prev, [id]: new Set(ready) }));

      // Update this category's UI immediately — don't wait for other categories
      setCh(prev => ({ ...prev, [id]: result.charts }));
      setDataStatus(prev => ({ ...prev, [id]: result.status }));
      setP(prev => ({ ...prev, [id]: enrichedPicks[id] }));
      progress(`${ticker} ready`);
    };

    // Process active category first, then remaining in parallel
    await processCategory(sortedIds[0]);
    if (sortedIds.length > 1) {
      await Promise.all(sortedIds.slice(1).map(processCategory));
    }

    // Load track records in background (not blocking page render)
    catIds.forEach(id => loadTrackLive(id));

    setPreloadReady(true);
  };

  // Start preloading all data immediately on mount
  const preloadStarted = useRef(false);
  useEffect(() => {
    if (!preloadStarted.current) {
      preloadStarted.current = true;
      preloadAllData();
    }
  }, []);

  // Periodic refresh: detect ET date change (midnight) and 8:30 AM pre-market data update
  const lastETDateRef = useRef(getETDate());
  const morningRefreshDone = useRef(false);
  useEffect(() => {
    const getETMinutes = () => {
      try {
        const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
        const h = parseInt(parts.find(p => p.type === 'hour').value, 10);
        const m = parseInt(parts.find(p => p.type === 'minute').value, 10);
        return h * 60 + m;
      } catch { return -1; }
    };
    const checkRefresh = () => {
      try {
        const etDate = getETDate();
        // Midnight: date changed — reset morning flag and reload on market days
        if (etDate !== lastETDateRef.current) {
          lastETDateRef.current = etDate;
          morningRefreshDone.current = false;
          const d = new Date(etDate + "T12:00:00Z");
          const day = d.getUTCDay();
          if (day !== 0 && day !== 6 && !US_HOLIDAYS.has(etDate)) {
            apiPicksRef.current = null;
            preloadStarted.current = false;
            preloadAllData();
          }
          return;
        }
        // 8:30 AM ET: refresh picks with fresh pre-market data (once per day)
        const mins = getETMinutes();
        if (mins >= 510 && !morningRefreshDone.current) {
          morningRefreshDone.current = true;
          const d = new Date(etDate + "T12:00:00Z");
          const day = d.getUTCDay();
          if (day !== 0 && day !== 6 && !US_HOLIDAYS.has(etDate)) {
            apiPicksRef.current = null;
            preloadStarted.current = false;
            preloadAllData();
          }
        }
        // Reset morning flag before 8:30 AM so it triggers again next morning
        if (mins < 510) morningRefreshDone.current = false;
      } catch {}
    };
    const interval = setInterval(checkRefresh, 60000);
    return () => clearInterval(interval);
  }, []);

  // When switching categories, load track data if not already loaded
  useEffect(() => { loadTrackLive(ac); }, [ac]);

  const pk = picks[ac]; const cc = (charts[ac]||{})[tf]||[]; const cat = CATS.find(c=>c.id===ac);
  const sigs = SIGS[ac]||[]; const hist = HIST_MKT[ac]||[];

  const ds = dataStatus[ac] || "loading";
  const Tabs = ({s}) => (<div className="ct fs" style={s}>{CATS.map(c=>(<button key={c.id} className={`cb${ac===c.id?" on":""}`} onClick={()=>{setAc(c.id);setTf("1D");}} style={ac===c.id?{color:c.color}:{}}><span>{c.icon}</span>{c.short}</button>))}</div>);
  const DataBadge = () => {
    const cfg = { live: { bg: "var(--gl)", color: "var(--gn)", text: "Live Data" }, delayed: { bg: "var(--aml)", color: "#92400E", text: "Delayed" }, offline: { bg: "var(--rl)", color: "var(--rd)", text: "Simulated Data" }, static: { bg: "var(--al)", color: "var(--ac)", text: "Reference Data" }, loading: { bg: "#F3F4F6", color: "var(--mu)", text: "Updating..." } };
    const c = cfg[ds] || cfg.static;
    return (<span className="fs" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 6, background: c.bg, color: c.color }}>{ds === "live" && <span className="ld" style={{ width: 6, height: 6 }} />}{c.text}</span>);
  };
  const Disc = () => (<div style={{background:"var(--aml)",borderLeft:"4px solid var(--am)",padding:"12px 18px",borderRadius:"0 8px 8px 0",fontSize:13,color:"#92400E",lineHeight:1.6}} className="fs">⚠️ <strong>Educational content only.</strong> Hirsch Capital does not provide investment advice. All equities carry risk. Past performance is not predictive.</div>);

  const TT = ({data,limit}) => (<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}} className="fs"><thead><tr style={{borderBottom:"2px solid var(--bd)"}}>{["Date","Ticker","Entry","Close","High","Low","Return","Max Run","Score"].map(h=>(<th key={h} style={{padding:"10px",textAlign:"left",fontSize:11,fontWeight:600,color:"var(--mu)",textTransform:"uppercase",letterSpacing:".06em"}}>{h}</th>))}</tr></thead><tbody>{(data||[]).slice(0,limit||999).map((p,i)=>{const retNum=pctRet(p.e,p.c);const mrNum=pctRet(p.e,p.h);const ret=retNum.toFixed(1);const mr=mrNum.toFixed(1);return(<tr key={i} style={{borderBottom:"1px solid var(--bd)"}} onMouseEnter={e=>e.currentTarget.style.background="#F9FAFB"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}><td style={{padding:"11px 10px",fontSize:13,color:"var(--mu)"}}>{p.d}</td><td style={{padding:"11px 10px",fontSize:14,fontWeight:700}}>{p.t}</td><td style={{padding:"11px 10px",fontSize:13}}>${Number(p.e||0).toFixed(2)}</td><td style={{padding:"11px 10px",fontSize:13}}>${Number(p.c||0).toFixed(2)}</td><td style={{padding:"11px 10px",fontSize:13,color:"var(--gn)"}}>${Number(p.h||0).toFixed(2)}</td><td style={{padding:"11px 10px",fontSize:13,color:"var(--rd)"}}>${Number(p.l||0).toFixed(2)}</td><td style={{padding:"11px 10px",fontSize:13,fontWeight:600,color:retNum>=0?"var(--gn)":"var(--rd)"}}>{retNum>=0?"+":""}{ret}%</td><td style={{padding:"11px 10px",fontSize:13,fontWeight:600,color:mrNum>=0?"var(--gn)":"var(--rd)"}}>{mrNum>=0?"+":""}{mr}%</td><td style={{padding:"11px 10px"}}><span style={{background:p.s>=80?"var(--gl)":"var(--al)",color:p.s>=80?"var(--gn)":"var(--ac)",padding:"3px 10px",borderRadius:6,fontSize:12,fontWeight:600}}>{p.s}</span></td></tr>);})}</tbody></table></div>);

  // NAV
  const Nav = () => (<nav style={{position:"fixed",top:0,left:0,right:0,zIndex:100,padding:sc?"10px 0":"16px 0",background:sc?"rgba(250,250,248,.88)":"transparent",backdropFilter:sc?"blur(20px)":"none",borderBottom:sc?"1px solid var(--bd)":"none",transition:"all .3s"}} className="fs">
    <div style={{maxWidth:1200,margin:"0 auto",padding:"0 24px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={()=>setPg("home")}>
        <div style={{width:34,height:34,borderRadius:9,background:"linear-gradient(135deg,#0C0F14,#1E2330)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:15}} className="ff">H</div>
        <span style={{fontSize:17,fontWeight:600,color:"var(--tx)",letterSpacing:"-.02em"}}>Hirsch Capital</span>
      </div>
      <div style={{display:"flex",gap:28,alignItems:"center"}} className="dn">
        {[["home","Home"],["pick","Today's Picks"],["track","Track Record"],["method","Methodology"],["about","About"]].map(([id,l])=>(<button key={id} onClick={()=>{setPg(id);setMm(false);window.scrollTo(0,0);}} style={{background:"none",border:"none",cursor:"pointer",fontSize:14,fontWeight:pg===id?600:400,color:pg===id?"var(--tx)":"var(--mu)",padding:"4px 0",borderBottom:pg===id?"2px solid var(--ac)":"2px solid transparent",transition:"all .2s"}}>{l}</button>))}
      </div>
      <button onClick={()=>setMm(!mm)} style={{display:"none",background:"none",border:"none",cursor:"pointer",fontSize:22,color:"var(--tx)",alignItems:"center",justifyContent:"center"}} className="mb">{mm?"✕":"☰"}</button>
    </div>
    {mm&&<div style={{position:"absolute",top:"100%",left:0,right:0,background:"rgba(250,250,248,.98)",backdropFilter:"blur(20px)",borderBottom:"1px solid var(--bd)",padding:"8px 24px"}}>
      {[["home","Home"],["pick","Today's Picks"],["track","Track Record"],["method","Methodology"],["about","About"]].map(([id,l])=>(<button key={id} onClick={()=>{setPg(id);setMm(false);window.scrollTo(0,0);}} style={{display:"block",width:"100%",textAlign:"left",padding:"12px 0",background:"none",border:"none",borderBottom:"1px solid var(--bd)",fontSize:15,fontWeight:pg===id?600:400,color:pg===id?"var(--ac)":"var(--tx)",cursor:"pointer"}}>{l}</button>))}
    </div>}
  </nav>);

  // HOME
  const Home = () => (<div>
    <div style={{background:"linear-gradient(180deg,#0C0F14 0%,#161B26 65%,var(--bg) 100%)",padding:"150px 24px 100px",textAlign:"center"}}>
      <div style={{maxWidth:820,margin:"0 auto"}}>
        {isMktOpen(new Date()) ? (
          <div className="afu" style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(0,196,140,.1)",border:"1px solid rgba(0,196,140,.2)",borderRadius:100,padding:"6px 16px",marginBottom:28}}>
            <span className="ld"/><span style={{color:"var(--gn)",fontSize:13,fontWeight:500}} className="fs">Market Open — 5 Categories Live</span>
          </div>
        ) : (
          <div className="afu" style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(245,158,11,.1)",border:"1px solid rgba(245,158,11,.2)",borderRadius:100,padding:"6px 16px",marginBottom:28}}>
            <span style={{color:"var(--am)",fontSize:13,fontWeight:500}} className="fs">Market Closed — Showing Last Trading Day</span>
          </div>
        )}
        <h1 className="ff afu d1" style={{fontSize:"clamp(40px,7vw,68px)",color:"#fff",lineHeight:1.05,letterSpacing:"-.03em",marginBottom:20}}>Daily Volatility<br/><em style={{color:"var(--gn)"}}>Picks</em></h1>
        <p className="fs afu d2" style={{fontSize:17,color:"#9CA3AF",maxWidth:560,margin:"0 auto 36px",lineHeight:1.7}}>Algorithm-driven stock picks across five market cap tiers — from penny stocks to hyperscalers. Deep reasoning, full transparency.</p>
        <div className="afu d3" style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
          <button onClick={()=>setPg("pick")} className="fs" style={{background:"var(--ac)",color:"#fff",border:"none",padding:"14px 30px",borderRadius:12,fontSize:15,fontWeight:600,cursor:"pointer"}}>View Today's Picks →</button>
          <button onClick={()=>setPg("track")} className="fs" style={{background:"rgba(255,255,255,.08)",color:"#fff",border:"1px solid rgba(255,255,255,.15)",padding:"14px 30px",borderRadius:12,fontSize:15,fontWeight:500,cursor:"pointer"}}>Track Record</button>
        </div>
      </div>
    </div>
    <div style={{maxWidth:1100,margin:"-40px auto 0",padding:"0 24px",position:"relative",zIndex:2}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(195px,1fr))",gap:14}}>
        {CATS.map((c,idx)=>{const p=picks[c.id];return(
          <div key={c.id} className="asi" style={{animationDelay:`${idx*.08}s`,opacity:0,background:"var(--cd)",borderRadius:16,padding:20,border:"1px solid var(--bd)",cursor:"pointer",boxShadow:"0 8px 30px rgba(0,0,0,.05)",transition:"transform .2s,box-shadow .2s"}}
            onClick={()=>{setAc(c.id);setPg("pick");window.scrollTo(0,0);}}
            onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-4px)";e.currentTarget.style.boxShadow="0 12px 40px rgba(0,0,0,.1)";}}
            onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="0 8px 30px rgba(0,0,0,.05)";}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
              <span style={{fontSize:18}}>{c.icon}</span>
              <span className="fs" style={{fontSize:11,fontWeight:700,color:c.color,textTransform:"uppercase",letterSpacing:".06em"}}>{c.label}</span>
            </div>
            {p?(<><div className="fs" style={{fontSize:22,fontWeight:700,marginBottom:2}}>{p.ticker}</div><div className="fs" style={{fontSize:12,color:"var(--mu)",marginBottom:8}}>{(p.company||"").substring(0,22)}</div><div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}><span className="fs" style={{fontSize:18,fontWeight:700}}>${p.price?.toFixed(2)}</span><span className="fs" style={{fontSize:13,fontWeight:600,color:p.change_pct>=0?"var(--gn)":"var(--rd)"}}>{p.change_pct>=0?"+":""}{p.change_pct}%</span></div></>)
            :(<><div className="sk" style={{height:22,width:60,marginBottom:6}}/><div className="sk" style={{height:14,width:100,marginBottom:10}}/><div className="sk" style={{height:18,width:80}}/></>)}
          </div>);})}
      </div>
    </div>
    <div style={{maxWidth:1000,margin:"80px auto",padding:"0 24px"}}>
      <h2 className="ff" style={{fontSize:34,textAlign:"center",marginBottom:10,letterSpacing:"-.02em"}}>How it works</h2>
      <p className="fs" style={{textAlign:"center",color:"var(--mu)",marginBottom:44,fontSize:15}}>Five categories. Five daily picks. One systematic process.</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:16}}>
        {[{n:"01",t:"Screen",d:"Filter stocks by market cap tier, volume, and data quality. Each category has calibrated criteria.",i:"🔍"},{n:"02",t:"Score",d:"Rank candidates 0-100 with category-specific signals — from ATR% for pennies to capex trends for hyperscalers.",i:"📊"},{n:"03",t:"Publish",d:"Select top scorer per category. Generate deep thesis with catalysts, risks, and invalidation triggers.",i:"📋"}].map((s,i)=>(<div key={i} style={{background:"var(--cd)",borderRadius:16,padding:26,border:"1px solid var(--bd)"}}><div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}><span style={{fontSize:22}}>{s.i}</span><span className="fs" style={{fontSize:11,fontWeight:700,color:"var(--ac)",letterSpacing:".1em"}}>STEP {s.n}</span></div><h3 className="ff" style={{fontSize:22,marginBottom:8}}>{s.t}</h3><p className="fs" style={{fontSize:14,color:"var(--mu)",lineHeight:1.7}}>{s.d}</p></div>))}
      </div>
    </div>
    <div style={{maxWidth:800,margin:"0 auto 60px",padding:"0 24px"}}><Disc/></div>
  </div>);

  // PICK PAGE
  const PreloadScreen = () => {
    const pct = preloadProgress.total > 0 ? Math.round((preloadProgress.done / preloadProgress.total) * 100) : 0;
    return (<div style={{maxWidth:520,margin:"0 auto",padding:"160px 24px 60px",textAlign:"center"}}>
      <div style={{width:64,height:64,borderRadius:16,background:"linear-gradient(135deg,#0C0F14,#1E2330)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:28,margin:"0 auto 28px"}} className="ff">H</div>
      <h2 className="ff" style={{fontSize:28,marginBottom:8,letterSpacing:"-.02em"}}>Loading Live Data</h2>
      <p className="fs" style={{color:"var(--mu)",marginBottom:32,fontSize:14,lineHeight:1.6}}>Fetching real-time market data, validating signals, and preparing all five categories.</p>
      <div style={{width:"100%",height:6,background:"#E8E8E4",borderRadius:3,overflow:"hidden",marginBottom:16}}>
        <div style={{width:`${pct}%`,height:"100%",background:"linear-gradient(90deg,var(--ac),var(--gn))",borderRadius:3,transition:"width .3s ease"}}/>
      </div>
      <div className="fs" style={{fontSize:12,color:"var(--mu)",marginBottom:8}}>{pct}% complete</div>
      <div className="fs" style={{fontSize:13,color:"var(--tx)",fontWeight:500,minHeight:20}}>{preloadProgress.step}</div>
      <div style={{display:"flex",justifyContent:"center",gap:8,marginTop:28,flexWrap:"wrap"}}>
        {CATS.map(c => {
          const loaded = !!picks[c.id] && validatePick(picks[c.id]);
          return (<div key={c.id} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 12px",borderRadius:8,background:loaded?"var(--gl)":"#F3F4F6",fontSize:11,fontWeight:600,color:loaded?"var(--gn)":"var(--mu)",transition:"all .3s"}}>
            {loaded ? <span style={{fontSize:10}}>&#10003;</span> : <div style={{width:10,height:10,border:"2px solid var(--mu)",borderTopColor:"transparent",borderRadius:"50%",animation:"sp .8s linear infinite"}}/>}
            {c.short}
          </div>);
        })}
      </div>
    </div>);
  };

  const Pick = () => {
    if(!pk) return null;
    const sb=pk.thesis_summary?.split("|")||[];const rk=pk.risks?.split("|")||[];const iv=pk.invalidation?.split("|")||[];
    const sv=pk.signal_values?.split("|")||[];const sw=pk.signal_weights?.split("|")||[];const sr=pk.signal_reasons?.split("|")||[];
    return(<div style={{maxWidth:940,margin:"0 auto",padding:"100px 24px 60px"}}>
      <Tabs s={{marginBottom:28}}/>
      <div className="afu">
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,flexWrap:"wrap"}}><span className="ld"/><span className="fs" style={{fontSize:12,color:cat.color,fontWeight:600,letterSpacing:".08em",textTransform:"uppercase"}}>{cat.label} Pick — {LIVE_DAY.toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}</span><DataBadge/></div>
        <div style={{display:"flex",alignItems:"baseline",gap:14,flexWrap:"wrap"}}><h1 className="ff" style={{fontSize:"clamp(34px,5vw,50px)",letterSpacing:"-.03em"}}>{pk.ticker}</h1><span className="fs" style={{fontSize:15,color:"var(--mu)"}}>{pk.company} · {pk.exchange}</span></div>
        <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}>{[cat.label,"High Volatility","Educational Only"].map(b=>(<span key={b} className="fs" style={{fontSize:11,fontWeight:600,padding:"4px 10px",borderRadius:6,background:b.includes("Vol")?"var(--rl)":b.includes("Edu")?"var(--aml)":"var(--al)",color:b.includes("Vol")?"var(--rd)":b.includes("Edu")?"#92400E":cat.color,textTransform:"uppercase",letterSpacing:".05em"}}>{b}</span>))}</div>
      </div>
      <div style={{marginTop:20}}><Disc/></div>
      <div style={{background:"var(--rl)",border:"1px solid rgba(255,71,87,.2)",borderRadius:12,padding:"12px 18px",marginTop:14,fontSize:13,color:"#B91C1C",lineHeight:1.6}} className="fs"><strong>⚠️ High-risk asset:</strong> Wide spreads, halts, dilution, and manipulation are common. Educational purposes only.</div>

      {/* CHART */}
      <div className="afu d1" style={{background:"var(--cd)",borderRadius:20,padding:26,border:"1px solid var(--bd)",marginTop:24,boxShadow:"0 4px 24px rgba(0,0,0,.04)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:16,marginBottom:22}}>
          <div><div className="fs" style={{fontSize:34,fontWeight:700,letterSpacing:"-.02em"}}>${pk.price?.toFixed(2)}</div><div className="fs" style={{fontSize:15,fontWeight:600,color:pk.change_pct>=0?"var(--gn)":"var(--rd)"}}>{pk.change_pct>=0?"▲ +":"▼ "}{pk.change_pct}% today</div></div>
          <div style={{display:"flex",gap:4,background:"#F3F4F6",borderRadius:10,padding:4}}>{["1D","5D","1M","6M","1Y"].map(t=>(<button key={t} onClick={()=>setTf(t)} className="fs" style={{padding:"6px 14px",borderRadius:8,border:"none",cursor:"pointer",fontSize:13,fontWeight:tf===t?600:400,background:tf===t?"#fff":"transparent",color:tf===t?"var(--tx)":"var(--mu)",boxShadow:tf===t?"0 1px 4px rgba(0,0,0,.08)":"none",transition:"all .2s"}}>{t}</button>))}</div>
        </div>
        <div style={{height:300}}>
          <Suspense fallback={<div className="sk" style={{height:"100%",width:"100%"}}/>}>
            <PriceChart cc={cc} tf={tf} catColor={cat.color}/>
          </Suspense>
        </div>
      </div>

      {/* METRICS — individual progress bars per metric until live data arrives */}
      <div style={{marginTop:18}}>
        {(()=>{
          const readySet = metricReady[ac] || new Set();
          const totalMetrics = 8;
          const doneCount = readySet.size;
          const allDone = doneCount >= totalMetrics;
          const metrics = [
            {l:"Market Cap",k:"market_cap",v:pk.market_cap,src:"Quote"},
            {l:"Avg Volume",k:"avg_volume",v:pk.avg_volume,src:"Quote"},
            {l:"Rel. Volume",k:"relative_volume",v:Number.isFinite(pk.relative_volume)?`${pk.relative_volume}x`:null,src:"Chart"},
            {l:"14D ATR%",k:"atr_pct",v:Number.isFinite(pk.atr_pct)?pk.atr_pct+"%":null,src:"Chart"},
            {l:"Float",k:"float_val",v:pk.float_val||pk.float,src:"Quote"},
            {l:"Short Interest",k:"short_interest",v:pk.short_interest,src:"Quote"},
            {l:"Gap %",k:"gap_pct",v:Number.isFinite(pk.gap_pct)?`${pk.gap_pct>=0?"+":""}${pk.gap_pct}%`:null,src:"Chart"},
            {l:"Pre-Mkt Vol",k:"premarket_vol",v:pk.premarket_vol,src:"Quote"},
          ];
          return (<>
            {!allDone && (
              <div className="afu d2" style={{background:"var(--cd)",borderRadius:14,padding:"14px 20px",border:"1px solid var(--bd)",marginBottom:10}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                  <div className="fs" style={{fontSize:12,fontWeight:600,color:"var(--tx)",letterSpacing:".02em"}}>Loading live metrics</div>
                  <div className="fs" style={{fontSize:12,fontWeight:700,color:"var(--ac)"}}>{doneCount}/{totalMetrics}</div>
                </div>
                <div style={{height:4,background:"var(--bd)",borderRadius:2,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${Math.max(5,Math.round((doneCount/totalMetrics)*100))}%`,background:"var(--ac)",borderRadius:2,transition:"width .4s ease"}}/>
                </div>
              </div>
            )}
            <div className={"afu d2 mg"} style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10}}>
              {metrics.map((m,i)=>{
                const isReady = readySet.has(m.k);
                const safe = isReady && isValidMetricValue(m.v) ? m.v : null;
                return (<div key={i} style={{background:"var(--cd)",borderRadius:12,padding:"12px 14px",border:`1px solid ${isReady?"var(--bd)":"var(--bd)"}`,transition:"all .3s ease"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:3}}>
                    <div className="fs" style={{fontSize:10,color:"var(--mu)",fontWeight:600,textTransform:"uppercase",letterSpacing:".06em"}}>{m.l}</div>
                    {isReady && <div style={{width:6,height:6,borderRadius:"50%",background:"var(--gn)"}}/>}
                  </div>
                  {isReady ? (
                    <div className="fs" style={{fontSize:17,fontWeight:700,animation:"fu .3s ease forwards"}}>{safe || "N/A"}</div>
                  ) : (
                    <div style={{marginTop:4}}>
                      <div style={{height:4,background:"var(--bd)",borderRadius:2,overflow:"hidden",marginBottom:6}}>
                        <div className="pb" style={{height:"100%",width:"100%"}}/>
                      </div>
                      <div className="fs" style={{fontSize:9,color:"var(--mu)",letterSpacing:".04em"}}>Fetching {m.src.toLowerCase()} data...</div>
                    </div>
                  )}
                </div>);
              })}
            </div>
          </>);
        })()}
      </div>

      {/* HIRSCH SCORE */}
      <div className="afu d3" style={{background:"var(--dk)",borderRadius:20,padding:26,marginTop:24,color:"#fff"}}>
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:22}}>
          <div style={{width:58,height:58,borderRadius:14,background:`conic-gradient(${cat.color} ${(pk.hirsch_score||0)*3.6}deg, #2A2D35 0deg)`,display:"flex",alignItems:"center",justifyContent:"center"}}><div className="fs" style={{width:42,height:42,borderRadius:10,background:"var(--dk)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:700}}>{pk.hirsch_score}</div></div>
          <div><div className="fs" style={{fontSize:17,fontWeight:700}}>HirschScore™ — {cat.label}</div><div className="fs" style={{fontSize:12,color:"#9CA3AF"}}>Composite signal · 0-100</div></div>
        </div>
        <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}} className="fs"><thead><tr style={{borderBottom:"1px solid rgba(255,255,255,.1)"}}>{["Signal","Value","Weight","Rationale"].map(h=>(<th key={h} style={{padding:"8px 10px",textAlign:"left",color:"#9CA3AF",fontWeight:500,fontSize:10,textTransform:"uppercase",letterSpacing:".08em"}}>{h}</th>))}</tr></thead><tbody>
          {sigs.map((s,i)=>(<tr key={i} style={{borderBottom:"1px solid rgba(255,255,255,.04)"}}><td style={{padding:"9px 10px",fontWeight:500}}>{s}</td><td style={{padding:"9px 10px",color:cat.color,fontWeight:600}}>{sv[i]?.trim()||"—"}</td><td style={{padding:"9px 10px"}}><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:50,height:4,borderRadius:2,background:"#2A2D35"}}><div style={{width:`${sw[i]?.trim()||0}%`,height:"100%",borderRadius:2,background:cat.color}}/></div><span style={{fontSize:11,color:"#9CA3AF"}}>{sw[i]?.trim()}%</span></div></td><td style={{padding:"9px 10px",color:"#9CA3AF",fontSize:12,maxWidth:280}}>{sr[i]?.trim()||"—"}</td></tr>))}
        </tbody></table></div>
      </div>

      {/* DEEP THESIS */}
      <div className="afu d4" style={{marginTop:28}}>
        <h2 className="ff" style={{fontSize:30,marginBottom:22,letterSpacing:"-.02em"}}>Deep Thesis</h2>
        {[{t:"What This Stock Is",cl:cat.color,ch:<p className="fs" style={{fontSize:14,lineHeight:1.8}}>{pk.what_it_is}</p>},
          {t:"Thesis Summary",cl:cat.color,ch:sb.map((b,i)=>(<div key={i} style={{display:"flex",gap:10,marginBottom:8}}><div style={{width:6,height:6,borderRadius:"50%",background:cat.color,marginTop:8,flexShrink:0}}/><p className="fs" style={{fontSize:14,lineHeight:1.7}}>{b.trim()}</p></div>))},
          {t:"Catalysts & Why Today",cl:"var(--gn)",ch:pk.catalysts?.split("\n").filter(Boolean).map((p,i)=>(<p key={i} className="fs" style={{fontSize:14,lineHeight:1.8,marginBottom:12}}>{p.trim()}</p>))},
          {t:"What Could Drive Upside",cl:cat.color,ch:<p className="fs" style={{fontSize:14,lineHeight:1.8}}>{pk.upside_drivers}</p>},
          {t:"Key Levels to Watch",cl:"var(--am)",ch:<p className="fs" style={{fontSize:14,lineHeight:1.8}}>{pk.key_levels}</p>},
        ].map((sec,i)=>(<div key={i} style={{background:"var(--cd)",borderRadius:16,padding:22,border:"1px solid var(--bd)",marginBottom:14}}><h3 className="fs" style={{fontSize:12,fontWeight:700,color:sec.cl,textTransform:"uppercase",letterSpacing:".08em",marginBottom:10}}>{sec.t}</h3>{sec.ch}</div>))}

        <div style={{background:"var(--rl)",borderRadius:16,padding:22,border:"1px solid rgba(255,71,87,.15)",marginBottom:14}}>
          <h3 className="fs" style={{fontSize:12,fontWeight:700,color:"var(--rd)",textTransform:"uppercase",letterSpacing:".08em",marginBottom:12}}>Risks & Red Flags</h3>
          {rk.map((r,i)=>(<div key={i} style={{display:"flex",gap:10,marginBottom:8}}><span style={{color:"var(--rd)",flexShrink:0}}>⚠</span><p className="fs" style={{fontSize:14,lineHeight:1.7,color:"#B91C1C"}}>{r.trim()}</p></div>))}
        </div>
        <div style={{background:"#fff",borderRadius:16,padding:22,border:"2px dashed var(--rd)",marginBottom:14}}>
          <h3 className="fs" style={{fontSize:12,fontWeight:700,color:"var(--rd)",textTransform:"uppercase",letterSpacing:".08em",marginBottom:12}}>Invalidation Triggers</h3>
          <p className="fs" style={{fontSize:12,color:"var(--mu)",marginBottom:12}}>If any occur, the thesis is likely broken.</p>
          {iv.map((v,i)=>(<div key={i} style={{display:"flex",gap:10,marginBottom:8}}><span style={{color:"var(--rd)",fontWeight:700,flexShrink:0}}>✕</span><p className="fs" style={{fontSize:14,lineHeight:1.7}}>{v.trim()}</p></div>))}
        </div>
      </div>

      <div style={{marginTop:36}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><h3 className="ff" style={{fontSize:22}}>Recent {cat.label} Picks</h3><button onClick={()=>setPg("track")} className="fs" style={{background:"none",border:"none",cursor:"pointer",color:"var(--ac)",fontSize:14,fontWeight:500}}>View all →</button></div><div style={{background:"var(--cd)",borderRadius:16,padding:20,border:"1px solid var(--bd)"}}><TT data={hist} limit={5}/></div></div>
      <div style={{marginTop:24}}><Disc/></div>
    </div>);
  };

  // TRACK RECORD
  const Track = () => {
    const h=HIST_MKT[ac]||[];const w=h.filter(p=>p.c>p.e).length;
    const ar=h.length?(h.reduce((a,p)=>a+((p.c-p.e)/p.e*100),0)/h.length).toFixed(1):"0";
    const mr2=h.length?(h.reduce((a,p)=>a+((p.h-p.e)/p.e*100),0)/h.length).toFixed(1):"0";
    return(<div style={{maxWidth:1000,margin:"0 auto",padding:"100px 24px 60px"}}>
      <h1 className="ff afu" style={{fontSize:40,marginBottom:6,letterSpacing:"-.02em"}}>Track Record</h1>
      <p className="fs afu d1" style={{color:"var(--mu)",marginBottom:24}}>Full transparency — wins and losses.</p>
      <Tabs s={{marginBottom:24}}/><Disc/>
      <div className="afu d2" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:14,margin:"24px 0"}}>
        {[{l:"Win Rate",v:`${h.length?((w/h.length)*100).toFixed(0):0}%`,s:`${w}/${h.length}`,c:"var(--gn)"},{l:"Avg Return",v:`${ar}%`,s:"Entry to close",c:ar>=0?"var(--gn)":"var(--rd)"},{l:"Avg Max Run",v:`${Number(mr2)>=0?"+":""}${mr2}%`,s:"Entry to high",c:Number(mr2)>=0?"var(--gn)":"var(--rd)"},{l:"Total Picks",v:h.length,s:cat.label,c:cat.color}].map((s,i)=>(<div key={i} style={{background:"var(--cd)",borderRadius:14,padding:20,border:"1px solid var(--bd)"}}><div className="fs" style={{fontSize:10,fontWeight:600,color:"var(--mu)",textTransform:"uppercase",letterSpacing:".08em",marginBottom:6}}>{s.l}</div><div className="fs" style={{fontSize:26,fontWeight:700,color:s.c}}>{s.v}</div><div className="fs" style={{fontSize:12,color:"var(--mu)",marginTop:2}}>{s.s}</div></div>))}
      </div>
      <div className="afu d3" style={{background:"var(--cd)",borderRadius:16,padding:22,border:"1px solid var(--bd)"}}><TT data={h}/></div>
      <div style={{background:"var(--aml)",borderRadius:12,padding:"14px 18px",marginTop:20,fontSize:13,color:"#92400E",lineHeight:1.6}} className="fs"><strong>Honesty Mode:</strong> All picks shown — not just winners. Past performance is not predictive. Educational only.</div>
    </div>);
  };

  // METHODOLOGY
  const Method = () => (<div style={{maxWidth:760,margin:"0 auto",padding:"100px 24px 60px"}}>
    <h1 className="ff afu" style={{fontSize:40,marginBottom:6,letterSpacing:"-.02em"}}>Methodology</h1>
    <p className="fs afu d1" style={{color:"var(--mu)",marginBottom:24}}>How the HirschScore algorithm works across all five tiers.</p><Disc/>
    {[{t:"Five Market Cap Tiers",c:"The algorithm operates across five distinct categories: Penny Stocks (< $5), Small Cap ($300M-$2B), Mid Cap ($2B-$10B), Large Cap ($10B-$200B), and Hyperscalers ($200B+). Each tier has calibrated screening criteria, signal weights, and risk thresholds."},
      {t:"Universe Filtering",c:"Each category screens for stocks meeting its price and market cap criteria, with minimum volume thresholds scaled to the tier. Data quality gates remove tickers with missing fields."},
      {t:"The HirschScore (0-100)",c:"Each candidate is scored using 7 category-specific signals. Penny stocks emphasize ATR% and float dynamics. Small caps weight institutional flow. Mid caps focus on options flow. Large caps track gamma exposure. Hyperscalers prioritize AI capex trends and competitive moat."},
      {t:"Selection & Thesis",c:"Highest-scoring stock per category passing risk gates is published. A structured thesis covers: company description, signal evidence, catalysts, upside drivers, key levels, risks, and explicit invalidation triggers."},
      {t:"Limitations",c:"This model is rules-based and backward-looking. It cannot predict the future. All stocks carry risk. This is educational, not investment advice."},
    ].map((s,i)=>(<div key={i} style={{background:"var(--cd)",borderRadius:16,padding:22,border:"1px solid var(--bd)",marginTop:14}}><h3 className="fs" style={{fontSize:15,fontWeight:700,marginBottom:8}}>{s.t}</h3><p className="fs" style={{fontSize:14,lineHeight:1.8,color:"var(--mu)"}}>{s.c}</p></div>))}
  </div>);

  // ABOUT
  const About = () => (<div style={{maxWidth:700,margin:"0 auto",padding:"100px 24px 60px"}}>
    <h1 className="ff afu" style={{fontSize:40,marginBottom:24,letterSpacing:"-.02em"}}>About</h1>
    <div className="afu d1" style={{background:"var(--cd)",borderRadius:20,padding:30,border:"1px solid var(--bd)"}}>
      <div style={{width:64,height:64,borderRadius:16,background:"linear-gradient(135deg,#0C0F14,#1E2330)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:28,marginBottom:22}} className="ff">H</div>
      <h2 className="ff" style={{fontSize:26,marginBottom:14}}>Hirsch Capital</h2>
      <div className="fs" style={{fontSize:15,lineHeight:1.9,color:"var(--mu)"}}>
        <p style={{marginBottom:14}}>Hirsch Capital applies systematic, quantitative analysis across the entire market cap spectrum — from penny stocks to trillion-dollar hyperscalers.</p>
        <p style={{marginBottom:14}}>Every day, five separate algorithms identify one high-volatility candidate per tier. Each pick comes with transparent scoring, deep reasoning, and explicit risk warnings.</p>
        <p>This is not investment advice. Always do your own research.</p>
      </div>
      <div style={{borderTop:"1px solid var(--bd)",marginTop:24,paddingTop:20,display:"flex",gap:14,flexWrap:"wrap"}}>
        <div className="fs" style={{padding:"10px 18px",borderRadius:10,background:"#F3F4F6",fontSize:14,color:"var(--mu)"}}>📧 contact@hirschcapital.com</div>
        <div className="fs" style={{padding:"10px 18px",borderRadius:10,background:"#F3F4F6",fontSize:14,color:"var(--mu)"}}>𝕏 @HirschCapital</div>
      </div>
    </div>
    <div style={{marginTop:24}}><Disc/></div>
  </div>);

  // FOOTER
  const Foot = () => (<footer style={{background:"var(--dk)",padding:"44px 24px",marginTop:40}}>
    <div style={{maxWidth:1000,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:28,marginBottom:28}}>
        <div><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}><div style={{width:28,height:28,borderRadius:7,background:"rgba(255,255,255,.1)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:13}} className="ff">H</div><span className="fs" style={{color:"#fff",fontSize:15,fontWeight:600}}>Hirsch Capital</span></div><p className="fs" style={{color:"#6B7280",fontSize:12,maxWidth:280,lineHeight:1.6}}>Daily volatility picks across 5 tiers. Educational only.</p></div>
        <div style={{display:"flex",gap:36,flexWrap:"wrap"}}>{[{t:"Product",i:[["pick","Today's Picks"],["track","Track Record"]]},{t:"Info",i:[["method","Methodology"],["about","About"]]}].map((c,i)=>(<div key={i}><div className="fs" style={{color:"#6B7280",fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:".1em",marginBottom:10}}>{c.t}</div>{c.i.map(([id,l])=>(<button key={id} onClick={()=>{setPg(id);window.scrollTo(0,0);}} className="fs" style={{display:"block",background:"none",border:"none",color:"#9CA3AF",fontSize:13,cursor:"pointer",padding:"3px 0"}}>{l}</button>))}</div>))}</div>
      </div>
      <div style={{borderTop:"1px solid rgba(255,255,255,.08)",paddingTop:20}}><p className="fs" style={{color:"#4B5563",fontSize:11,lineHeight:1.7,marginBottom:6}}>Educational content only. Not investment advice. All equities carry risk. Past performance is not predictive.</p><p className="fs" style={{color:"#374151",fontSize:11}}>© 2026 Hirsch Capital</p></div>
    </div>
  </footer>);

  return(<ErrorBoundary><div className="fs" style={{background:"var(--bg)",minHeight:"100vh",color:"var(--tx)"}}>
    <style>{CSS}</style><Nav/>
    {!preloadReady ? (
      <div style={{minHeight:"calc(100vh - 80px)",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <PreloadScreen/>
      </div>
    ) : (
      <>
        {pg==="home"&&<Home/>}
        {pg==="pick"&&<Pick/>}
        {pg==="track"&&<Track/>}
        {pg==="method"&&<Method/>}
        {pg==="about"&&<About/>}
      </>
    )}
    <Foot/>
  </div></ErrorBoundary>);
}
