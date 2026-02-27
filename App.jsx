import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from "react";

const PriceChart = lazy(() => import("./src/PriceChart.jsx"));

// One-time force refresh: on this date (ET), the initial page load will
// bypass cached picks and regenerate all categories + track records fresh.
const FORCE_REFRESH_DATE = '2026-02-27';

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

// No static track record data — track record is built exclusively from live API data.
// Results only appear after the algorithm has generated picks and recorded outcomes.

// Static reference data — shown instantly on page load, then upgraded with live data in background.
// Sources: Yahoo Finance, SEC filings, company investor relations. Values are representative snapshots.
const STATIC_PICKS = {
  penny: {
    ticker: "SNDL", company: "SNDL Inc", exchange: "NASDAQ",
    price: 1.92, change_pct: 4.5, market_cap: "520M", avg_volume: "28.1M",
    relative_volume: 2.3, atr_pct: 9.1, float_val: "245.8M", short_interest: "11.2%",
    gap_pct: 2.8, premarket_vol: "2.9M", hirsch_score: 81,
    what_it_is: "SNDL Inc is a Canadian cannabis company that produces, distributes, and sells cannabis products for adult recreational use. The company also operates retail cannabis stores and has expanded into liquor retail through its SunStream subsidiary. SNDL is listed on NASDAQ and focused on the Canadian market.",
    thesis_summary: "SNDL ranks highest in the Penny Stocks category with strong volatility and volume surge signals|9.1% ATR with 2.3x relative volume creates an actionable momentum setup in the cannabis sector|5-day momentum and RSI positioning indicate bullish near-term sentiment with continuation potential|Elevated trading activity and gap-up signal suggest institutional and retail interest convergence",
    catalysts: "SNDL is showing 2.3x its average daily volume, indicating heightened market interest in cannabis stocks.\n\nThe stock gapped up 2.8% from the previous close, reflecting positive overnight positioning tied to cannabis sector catalysts and regulatory developments.",
    upside_drivers: "Primary driver is continuation under the 9.1% ATR volatility regime with 2.3x volume supporting directional moves. A break above the 20-day high on sustained volume could trigger momentum algorithms and extend the rally toward the next resistance zone.",
    key_levels: "Support at $1.65 (20-day low). Resistance at $2.28 (20-day high). Moving average at $1.84. Current price $1.92 is 4.3% above the MA.",
    risks: "Volatility risk — 9.1% ATR means wide intraday swings, potential halts, and gap risk|Volume fade risk — if relative volume drops below 1.0x, momentum thesis weakens significantly|Regulatory risk — cannabis sector sensitive to policy changes and legislative timelines",
    invalidation: "Price breaks below $1.65 support on heavy volume|Relative volume collapses below 0.8x average daily turnover|RSI drops below 40 on a closing basis, indicating momentum failure",
    signal_values: "9.1%|2.3x|+2.8%|+7.2%|1.5x|58|+4.3%",
    signal_weights: "22|20|14|12|10|12|10",
    signal_reasons: "ATR at 9.1% indicates high volatility regime — favorable for directional moves in penny stocks|2.3x average volume signals above-average institutional and retail participation|+2.8% gap suggests positive overnight catalyst absorption from cannabis sector|Strong bullish 5-day momentum at +7.2% confirms short-term trend|Volume accelerating at 1.5x recent trend — building conviction for continuation|RSI at 58 — bullish momentum with room to run before overbought territory|Trading 4.3% above moving average — mild bullish positioning confirmed",
  },
  small: {
    ticker: "RKLB", company: "Rocket Lab USA Inc", exchange: "NASDAQ",
    price: 22.40, change_pct: 3.8, market_cap: "10.2B", avg_volume: "18.5M",
    relative_volume: 2.1, atr_pct: 5.8, float_val: "412.6M", short_interest: "7.8%",
    gap_pct: 1.5, premarket_vol: "1.5M", hirsch_score: 83,
    what_it_is: "Rocket Lab USA Inc is an aerospace company that provides launch services and space systems. The company manufactures the Electron small-satellite launch vehicle and Neutron medium-lift rocket, and builds satellite components including reaction wheels, star trackers, and solar panels through its Space Systems division.",
    thesis_summary: "Rocket Lab ranks highest in the Small Cap category with strong volume surge and momentum signals|5.8% ATR with 2.1x relative volume creates a high-conviction setup in the space launch sector|5-day momentum at +7.5% and RSI at 60 indicates strong bullish positioning with room to continue|Accelerating institutional interest with volume trend supporting further upside potential",
    catalysts: "RKLB is trading at 2.1x its average daily volume, signaling unusual accumulation activity in the space launch sector.\n\nThe stock gapped up 1.5% overnight, reflecting positive market positioning ahead of upcoming launch manifests and government defense contracts driving renewed sector interest.",
    upside_drivers: "Primary driver is continuation under the 5.8% ATR volatility regime with 2.1x volume supporting strong directional moves. A break above the recent 20-day high on sustained volume could trigger algorithmic momentum buying and extend the current rally.",
    key_levels: "Support at $19.20 (20-day low). Resistance at $25.80 (20-day high). Moving average at $21.50. Current price $22.40 is 4.2% above the MA.",
    risks: "Volatility risk — 5.8% ATR means significant intraday swings and gap risk are possible|Volume fade risk — if relative volume drops below 1.0x, the momentum thesis weakens|Execution risk — launch delays or failures can materially impact sentiment and valuation",
    invalidation: "Price breaks below $19.20 support on heavy volume|Relative volume collapses below 0.8x average daily turnover|RSI drops below 40 on a closing basis, signaling momentum failure",
    signal_values: "5.8%|2.1x|+1.5%|+7.5%|1.5x|60|+4.2%",
    signal_weights: "16|18|10|16|12|14|14",
    signal_reasons: "ATR at 5.8% shows elevated volatility — typical for active swing setups in small caps|2.1x average volume signals unusual institutional accumulation activity|+1.5% gap indicates positive overnight positioning shift from sector catalysts|Strong bullish 5-day momentum at +7.5% confirms sustained directional trend|Volume accelerating at 1.5x recent trend — building conviction among participants|RSI at 60 — bullish momentum with room to run before overbought levels|Trading 4.2% above moving average — confirmed uptrend positioning",
  },
  mid: {
    ticker: "DDOG", company: "Datadog Inc", exchange: "NASDAQ",
    price: 142.80, change_pct: 2.9, market_cap: "46.5B", avg_volume: "5.2M",
    relative_volume: 1.9, atr_pct: 3.5, float_val: "310.2M", short_interest: "3.1%",
    gap_pct: 1.1, premarket_vol: "480K", hirsch_score: 84,
    what_it_is: "Datadog Inc provides a cloud-native monitoring and analytics platform for developers, IT operations, and business users. The company's SaaS platform integrates infrastructure monitoring, application performance monitoring, log management, and security monitoring into a unified observability suite.",
    thesis_summary: "Datadog ranks highest in the Mid Cap category with strong technical setup and volume confirmation|3.5% ATR with 1.9x relative volume indicates institutional accumulation in cloud observability leader|Momentum and RSI signals confirm bullish trend with breakout potential above recent resistance|Volume flow analysis shows sustained buying interest supporting the current technical setup",
    catalysts: "DDOG is trading at 1.9x average volume, indicating heightened institutional activity in the cloud observability sector.\n\nThe stock gapped up 1.1% overnight, reflecting positive sentiment from enterprise cloud spending data. Cloud observability remains a secular growth theme with AI-driven monitoring demand.",
    upside_drivers: "Primary driver is the technical breakout setup with 1.9x volume confirmation. Datadog's expanding platform and strong net retention rates support fundamental momentum. A break above the 20-day high could trigger institutional buying algorithms.",
    key_levels: "Support at $132.40 (20-day low). Resistance at $155.60 (20-day high). Moving average at $138.90. Current price $142.80 is 2.8% above the MA.",
    risks: "Valuation risk — cloud names trade at premium multiples sensitive to growth deceleration|Competition risk — Splunk, New Relic, and Grafana continue expanding competitive offerings|Volume fade risk — if relative volume normalizes below 1.0x, breakout thesis weakens",
    invalidation: "Price breaks below $132.40 support on elevated volume|Relative volume collapses below 0.8x average|RSI drops below 40 on closing basis, indicating trend reversal",
    signal_values: "3.5%|1.9x|+1.1%|+5.2%|1.4x|59|+2.8%",
    signal_weights: "14|16|8|14|12|16|20",
    signal_reasons: "ATR at 3.5% shows moderate volatility profile — suitable for institutional swing positions|1.9x average volume confirms above-average institutional participation and flow|+1.1% gap indicates positive overnight positioning from sector sentiment|Moderate positive 5-day momentum at +5.2% supports continuation thesis|Volume trend stable at 1.4x — consistent participation from institutional buyers|RSI at 59 — bullish momentum with significant room before overbought territory|Trading 2.8% above moving average — mild bullish positioning within trend channel",
  },
  large: {
    ticker: "COIN", company: "Coinbase Global Inc", exchange: "NASDAQ",
    price: 248.60, change_pct: 3.1, market_cap: "62.8B", avg_volume: "8.9M",
    relative_volume: 1.8, atr_pct: 4.2, float_val: "195.4M", short_interest: "5.2%",
    gap_pct: 1.2, premarket_vol: "1.1M", hirsch_score: 86,
    what_it_is: "Coinbase Global Inc operates the largest cryptocurrency exchange in the United States. The company provides a platform for buying, selling, transferring, and storing cryptocurrency. Coinbase also offers institutional trading, staking, custody, and a developer platform through its Base L2 blockchain network.",
    thesis_summary: "Coinbase ranks highest in the Large Cap category with strong institutional volume and trend confirmation|4.2% ATR with 1.8x relative volume reflects growing institutional positioning in crypto exchange leader|Crypto market momentum and regulatory clarity provide fundamental tailwinds to technical setup|RSI and trend signals confirm bullish momentum with multiple catalysts supporting continuation",
    catalysts: "COIN is showing 1.8x its average daily volume, indicating institutional accumulation amid rising crypto market activity.\n\nThe stock gapped up 1.2% from the previous close, reflecting positive sentiment from Bitcoin price appreciation and growing institutional crypto adoption. Regulatory developments continue to favor compliant exchanges.",
    upside_drivers: "Primary driver is Coinbase's expanding institutional business and crypto market momentum. The 1.8x volume surge with 4.2% ATR supports directional moves. A break above the 20-day high could trigger institutional momentum algorithms.",
    key_levels: "Support at $225.40 (20-day low). Resistance at $272.80 (20-day high). Moving average at $240.10. Current price $248.60 is 3.5% above the MA.",
    risks: "Regulatory risk — SEC enforcement actions and crypto regulation remain an overhang|Correlation risk — stock highly correlated with Bitcoin price which can be volatile|Competition risk — growing competition from decentralized exchanges and traditional finance entrants",
    invalidation: "Price breaks below $225.40 support on heavy institutional selling|Relative volume collapses below 0.8x average daily turnover|RSI drops below 40 on closing basis, indicating institutional distribution",
    signal_values: "4.2%|1.8x|+1.2%|+6.1%|1.3x|63|+3.5%",
    signal_weights: "10|14|8|16|12|18|22",
    signal_reasons: "Realized volatility at 4.2% reflects active large-cap price action with directional potential|1.8x institutional volume confirms above-average large-cap participation and flow|+1.2% gap assessment shows positive overnight positioning from crypto sector momentum|Strong trend strength at +6.1% over 5 days confirms directional institutional buying|Volume profile stable at 1.3x — consistent institutional participation observed|RSI at 63 — bullish momentum with significant headroom before overbought conditions|Trading 3.5% above moving average — relative strength confirmed within uptrend",
  },
  hyper: {
    ticker: "META", company: "Meta Platforms Inc", exchange: "NASDAQ",
    price: 612.30, change_pct: 1.7, market_cap: "1.55T", avg_volume: "18.4M",
    relative_volume: 1.5, atr_pct: 2.6, float_val: "2.2B", short_interest: "0.9%",
    gap_pct: 0.6, premarket_vol: "2.1M", hirsch_score: 88,
    what_it_is: "Meta Platforms Inc operates the world's largest social networking platforms including Facebook, Instagram, WhatsApp, and Messenger. The company generates revenue primarily through targeted digital advertising and is investing heavily in AI infrastructure, the metaverse through Reality Labs, and open-source large language models through its Llama series.",
    thesis_summary: "Meta Platforms ranks highest in the Hyperscalers category with strong trend confirmation and RSI positioning|2.6% ATR with 1.5x relative volume reflects sustained institutional accumulation in the social media and AI leader|AI monetization and advertising efficiency gains provide multi-quarter fundamental tailwinds|Trend momentum and volume dynamics confirm the strongest technical setup among mega-cap tech names",
    catalysts: "META is trading at 1.5x its average daily volume, reflecting continued institutional demand for the AI and digital advertising leader.\n\nThe stock gapped up 0.6% overnight as AI-driven advertising improvements drive revenue acceleration. Meta's Llama AI models, Reels monetization, and efficiency gains continue driving strong sentiment.",
    upside_drivers: "Primary driver is Meta's AI-powered advertising improvements driving revenue acceleration, with institutional investors building positions. The 1.5x volume with trend confirmation supports continued accumulation. A move above the 20-day high on volume could trigger index rebalancing flows.",
    key_levels: "Support at $580.20 (20-day low). Resistance at $645.80 (20-day high). Moving average at $602.40. Current price $612.30 is 1.6% above the MA.",
    risks: "Regulatory risk — antitrust scrutiny and data privacy regulations could impact operations|Competition risk — TikTok and YouTube continue to compete for user engagement and ad dollars|Capex risk — massive AI infrastructure spending could pressure margins if monetization lags",
    invalidation: "Price breaks below $580.20 support on elevated institutional selling volume|Relative volume collapses below 0.8x average daily turnover|RSI fails to hold above 50 on closing basis, indicating trend momentum loss",
    signal_values: "2.6%|1.5x|+0.6%|+4.2%|1.3x|62|+1.6%",
    signal_weights: "8|12|6|18|10|20|26",
    signal_reasons: "Volatility regime at 2.6% reflects measured mega-cap price action — typical for sustained trends|1.5x volume dynamics confirm steady institutional accumulation in AI and social media leader|+0.6% gap reflects continued positive overnight positioning from digital advertising strength|Trend momentum at +4.2% over 5 days confirms directional buying pressure|Volume character at 1.3x — steady institutional participation without exhaustion signals|RSI at 62 — strong bullish positioning with room to continue before overbought levels|Trading 1.6% above moving average — trend confirmation is the strongest signal for hyperscalers",
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

// Stable component defined outside App — React can reconcile it across renders
// so category switches are always reflected in both the tabs and content.
const CategoryTabs = ({ activeId, onSelect, style }) => (
  <div className="ct fs" style={style}>
    {CATS.map(c => (
      <button key={c.id} className={`cb${activeId === c.id ? " on" : ""}`}
        onClick={() => onSelect(c.id)}
        style={activeId === c.id ? { color: c.color } : {}}>
        <span>{c.icon}</span>{c.short}
      </button>
    ))}
  </div>
);

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
  const trackLiveRef = useRef(trackLive);
  useEffect(() => { trackLiveRef.current = trackLive; }, [trackLive]);

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

  const loadTrackLive = async (id, force = false) => {
    if (!force && trackLiveRef.current[id]?.length > 0) return;
    try {
      // Cache-bust with timestamp when forced to defeat any CDN caching
      const bust = force ? `&_t=${Date.now()}` : '';
      const r = await fetch(`/api/track-record?category=${encodeURIComponent(id)}&limit=8${bust}`, force ? { cache: 'no-store' } : {});
      if (!r.ok) throw new Error(`Track record fetch failed`);
      const data = await r.json();
      const rows = (data.rows || []).map(row => ({
        d: new Date(row.date + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        t: row.ticker,
        e: row.reference_price,
        c: row.close,
        h: row.high,
        l: row.low,
        s: row.score,
      }));
      // Only show live API data — no static fallbacks
      setTrackLive(p => ({ ...p, [id]: rows }));
    } catch {
      // On fetch error, keep whatever we already have or set empty
      setTrackLive(p => p[id]?.length > 0 ? p : { ...p, [id]: [] });
    }
  };

  // Fetch all picks from the backend API (uses live market data)
  const apiPicksRef = useRef(null);
  const fetchApiPicks = async ({ force = false } = {}) => {
    if (!force && apiPicksRef.current) return apiPicksRef.current;
    try {
      // Cache-bust with timestamp to defeat any CDN/browser caching layer
      const bust = force ? `&_t=${Date.now()}` : '';
      const url = force ? `/api/today?force=true${bust}` : "/api/today";
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) return null;
      const data = await r.json();
      // Only cache if picks have real scored data
      const hasRealData = Object.values(data?.picks || {}).some(p => p.hirsch_score > 0);
      if (hasRealData) apiPicksRef.current = data;
      return data;
    } catch {
      // Retry once on network failure after a brief delay
      try {
        await new Promise(r => setTimeout(r, 2000));
        const bust = force ? `&_t=${Date.now()}` : '';
        const url = force ? `/api/today?force=true${bust}` : "/api/today";
        const r = await fetch(url, { cache: 'no-store' });
        if (!r.ok) return null;
        const data = await r.json();
        const hasRealData = Object.values(data?.picks || {}).some(p => p.hirsch_score > 0);
        if (hasRealData) apiPicksRef.current = data;
        return data;
      } catch { return null; }
    }
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

  /** Master preload: fetch all picks, enrich + load charts per category, update UI as each completes.
   *  @param opts.forceRefresh - if true, always force the backend to regenerate picks (used for 8:30/9:30 AM gates)
   *  @param opts.isGateRefresh - if true, this is a scheduled gate transition — batch-update all picks at once */
  const preloadingRef = useRef(false);
  const pendingRefreshRef = useRef(null);
  const preloadAllData = async ({ forceRefresh = false, isGateRefresh = false } = {}) => {
    // Prevent concurrent preloads from racing
    if (preloadingRef.current) return;
    preloadingRef.current = true;
    try {
    const catIds = CATS.map(c => c.id);
    // Prioritize the currently active category so it gets live data first
    const sortedIds = [ac, ...catIds.filter(id => id !== ac)];
    const totalSteps = 1 + sortedIds.length * 2; // api + (enrich + charts) per category
    let done = 0;
    const progress = (step) => { done++; setPreloadProgress({ step, done, total: totalSteps }); };

    // Step 1: Fetch all picks from the backend API
    setPreloadProgress({ step: "Fetching live picks from algorithm...", done: 0, total: totalSteps });
    let apiData = await fetchApiPicks({ force: forceRefresh });

    // If picks came back without real data (or null), force a fresh regeneration with retries
    const picksHaveRealData = Object.values(apiData?.picks || {}).some(p => p.hirsch_score > 0);
    if (!picksHaveRealData) {
      setPreloadProgress({ step: "Regenerating picks with fresh live data...", done: 0, total: totalSteps });
      const retryData = await fetchApiPicks({ force: true });
      if (retryData) apiData = retryData;
    }
    progress("Picks loaded");

    // ── BATCH UPDATE: Switch all categories at once from API data ──
    // At gate transitions (8:30/9:30), this ensures all picks change simultaneously
    // rather than trickling in one category at a time.
    if (apiData?.picks) {
      const batchPicks = {};
      for (const id of catIds) {
        batchPicks[id] = apiData.picks[id] || STATIC_PICKS[id];
      }
      setP(batchPicks); // Single state update — all categories switch at once
    }

    // Step 2: For each category, enrich + load charts in background, update UI as each completes
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
    // Individual try-catch ensures one category failure doesn't block others
    try { await processCategory(sortedIds[0]); } catch {}
    if (sortedIds.length > 1) {
      await Promise.allSettled(sortedIds.slice(1).map(processCategory));
    }

    // Mark page as ready immediately — track records load in background
    setPreloadReady(true);

    // Load track records non-blocking so the page isn't held up
    // Always force-refresh track records during gate transitions to get latest data
    Promise.all(catIds.map(id => loadTrackLive(id, forceRefresh || isGateRefresh))).catch(() => {});
    } catch {
    // Ensure the page always becomes accessible, even if data loading fails
    setPreloadReady(true);
    } finally {
      preloadingRef.current = false;
      // If a refresh was queued while we were loading (e.g. 8:30 AM gate fired
      // during initial page load), run it now so the update isn't lost
      if (pendingRefreshRef.current !== null) {
        const doForce = pendingRefreshRef.current;
        pendingRefreshRef.current = null;
        apiPicksRef.current = null;
        quoteCacheRef.current = {};
        gfCacheRef.current = {};
        preloadAllData({ forceRefresh: doForce, isGateRefresh: true });
      }
    }
  };

  // Start preloading all data immediately on mount
  // If today matches FORCE_REFRESH_DATE, force the backend to regenerate all picks fresh
  const preloadStarted = useRef(false);
  useEffect(() => {
    if (!preloadStarted.current) {
      preloadStarted.current = true;
      const forceToday = getETDate() === FORCE_REFRESH_DATE;
      if (forceToday) {
        // Aggressively clear ALL caches so every request fetches fresh data
        apiPicksRef.current = null;
        quoteCacheRef.current = {};
        gfCacheRef.current = {};
      }
      preloadAllData({ forceRefresh: forceToday, isGateRefresh: forceToday });
    }
  }, []);

  // Periodic refresh: detect ET date change (midnight), 8:30 AM pre-market, and 9:30 AM market-open
  const lastETDateRef = useRef(getETDate());
  const preMarketRefreshDone = useRef(false);  // 8:30 AM gate
  const marketOpenRefreshDone = useRef(false);  // 9:30 AM gate
  useEffect(() => {
    const getETMinutes = () => {
      try {
        const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
        const h = parseInt(parts.find(p => p.type === 'hour').value, 10);
        const m = parseInt(parts.find(p => p.type === 'minute').value, 10);
        return h * 60 + m;
      } catch { return -1; }
    };
    const triggerRefresh = ({ forceRefresh = false, isGateRefresh = false } = {}) => {
      if (preloadingRef.current) {
        // Queue the refresh — it will run after the current preload finishes
        pendingRefreshRef.current = forceRefresh;
        return;
      }
      apiPicksRef.current = null;
      quoteCacheRef.current = {};   // Clear stale quote cache so enrichment fetches fresh data
      gfCacheRef.current = {};      // Clear stale Google Finance cache
      preloadStarted.current = false;
      preloadAllData({ forceRefresh, isGateRefresh });
    };
    const checkRefresh = () => {
      try {
        const etDate = getETDate();
        const mins = getETMinutes();
        // Midnight: date changed — reset all flags and reload on market days
        if (etDate !== lastETDateRef.current) {
          lastETDateRef.current = etDate;
          preMarketRefreshDone.current = false;
          marketOpenRefreshDone.current = false;
          const d = new Date(etDate + "T12:00:00Z");
          const day = d.getUTCDay();
          if (day !== 0 && day !== 6 && !US_HOLIDAYS.has(etDate)) {
            triggerRefresh({ forceRefresh: false });
          }
          return;
        }
        // Gate 1 — 8:30 AM ET: fetch pre-generated picks (cron already generated them before 8:30)
        // No force needed — backend staleness check handles fallback if cron missed
        if (mins >= 510 && !preMarketRefreshDone.current) {
          preMarketRefreshDone.current = true;
          const d = new Date(etDate + "T12:00:00Z");
          const day = d.getUTCDay();
          if (day !== 0 && day !== 6 && !US_HOLIDAYS.has(etDate)) {
            triggerRefresh({ forceRefresh: false, isGateRefresh: true });
          }
        }
        // Gate 2 — 9:30 AM ET: fetch pre-generated picks for market-open window
        if (mins >= 570 && !marketOpenRefreshDone.current) {
          marketOpenRefreshDone.current = true;
          const d = new Date(etDate + "T12:00:00Z");
          const day = d.getUTCDay();
          if (day !== 0 && day !== 6 && !US_HOLIDAYS.has(etDate)) {
            triggerRefresh({ forceRefresh: false, isGateRefresh: true });
          }
        }
        // Reset flags before 8:30 AM so they trigger again next morning
        if (mins >= 0 && mins < 510) {
          preMarketRefreshDone.current = false;
          marketOpenRefreshDone.current = false;
        }
      } catch {}
    };
    // Check immediately on mount (in case page loads at/after a gate time)
    checkRefresh();
    const interval = setInterval(checkRefresh, 60000);
    return () => clearInterval(interval);
  }, []);

  // When switching categories, load track data if not already loaded
  useEffect(() => { loadTrackLive(ac); }, [ac]);

  const pk = picks[ac]; const cc = (charts[ac]||{})[tf]||[]; const cat = CATS.find(c=>c.id===ac);
  const sigs = SIGS[ac]||[]; const hist = trackLive[ac] || [];

  const ds = dataStatus[ac] || "loading";
  const handleTabSelect = useCallback((id) => { setAc(id); setTf("1D"); }, []);
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
      <CategoryTabs activeId={ac} onSelect={handleTabSelect} style={{marginBottom:28}}/>
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

      <div style={{marginTop:36}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><h3 className="ff" style={{fontSize:22}}>Recent {cat.label} Picks</h3><button onClick={()=>setPg("track")} className="fs" style={{background:"none",border:"none",cursor:"pointer",color:"var(--ac)",fontSize:14,fontWeight:500}}>View all →</button></div><div style={{background:"var(--cd)",borderRadius:16,padding:20,border:"1px solid var(--bd)"}}>{trackLive[ac] === undefined ? <div style={{textAlign:"center",padding:"20px 0"}}><div style={{width:20,height:20,border:"3px solid var(--bd)",borderTopColor:"var(--ac)",borderRadius:"50%",animation:"sp .8s linear infinite",margin:"0 auto 10px"}}/><div className="fs" style={{color:"var(--mu)",fontSize:13}}>Loading recent picks...</div></div> : hist.length > 0 ? <TT data={hist} limit={5}/> : <div className="fs" style={{textAlign:"center",padding:"20px 0",color:"var(--mu)",fontSize:14}}>Track record data will appear here after the first day of algorithm picks.</div>}</div></div>
      <div style={{marginTop:24}}><Disc/></div>
    </div>);
  };

  // TRACK RECORD
  const Track = () => {
    const h = trackLive[ac] || [];
    const isLoading = trackLive[ac] === undefined;
    const w = h.filter(p => p.c > p.e).length;
    const ar = h.length ? (h.reduce((a, p) => a + pctRet(p.e, p.c), 0) / h.length).toFixed(1) : "0";
    const mr2 = h.length ? (h.reduce((a, p) => a + pctRet(p.e, p.h), 0) / h.length).toFixed(1) : "0";
    const maxRet = h.length ? Math.max(...h.map(p => pctRet(p.e, p.h))).toFixed(1) : "0";
    return(<div style={{maxWidth:1000,margin:"0 auto",padding:"100px 24px 60px"}}>
      <h1 className="ff afu" style={{fontSize:40,marginBottom:6,letterSpacing:"-.02em"}}>Track Record</h1>
      <p className="fs afu d1" style={{color:"var(--mu)",marginBottom:24}}>Full transparency — wins and losses. Live results from algorithm picks, recorded after each day's close.</p>
      <CategoryTabs activeId={ac} onSelect={handleTabSelect} style={{marginBottom:24}}/><Disc/>
      <div className="afu d2" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:14,margin:"24px 0"}}>
        {[{l:"Win Rate",v:`${h.length?((w/h.length)*100).toFixed(0):0}%`,s:`${w}/${h.length} picks`,c:"var(--gn)"},{l:"Avg Return",v:`${Number(ar)>=0?"+":""}${ar}%`,s:"Entry to close",c:Number(ar)>=0?"var(--gn)":"var(--rd)"},{l:"Max Return",v:`${Number(maxRet)>=0?"+":""}${maxRet}%`,s:"Best single pick",c:Number(maxRet)>=0?"var(--gn)":"var(--rd)"},{l:"Total Picks",v:h.length,s:cat.label,c:cat.color}].map((s,i)=>(<div key={i} style={{background:"var(--cd)",borderRadius:14,padding:20,border:"1px solid var(--bd)"}}><div className="fs" style={{fontSize:10,fontWeight:600,color:"var(--mu)",textTransform:"uppercase",letterSpacing:".08em",marginBottom:6}}>{s.l}</div><div className="fs" style={{fontSize:26,fontWeight:700,color:s.c}}>{s.v}</div><div className="fs" style={{fontSize:12,color:"var(--mu)",marginTop:2}}>{s.s}</div></div>))}
      </div>
      {isLoading ? (
        <div className="afu d3" style={{background:"var(--cd)",borderRadius:16,padding:40,border:"1px solid var(--bd)",textAlign:"center"}}>
          <div style={{width:24,height:24,border:"3px solid var(--bd)",borderTopColor:"var(--ac)",borderRadius:"50%",animation:"sp .8s linear infinite",margin:"0 auto 16px"}}/>
          <div className="fs" style={{color:"var(--mu)",fontSize:14}}>Loading track record data...</div>
        </div>
      ) : h.length === 0 ? (
        <div className="afu d3" style={{background:"var(--cd)",borderRadius:16,padding:40,border:"1px solid var(--bd)",textAlign:"center"}}>
          <div style={{fontSize:36,marginBottom:12}}>📊</div>
          <div className="fs" style={{fontSize:16,fontWeight:600,marginBottom:8}}>No Track Record Yet</div>
          <div className="fs" style={{color:"var(--mu)",fontSize:14,lineHeight:1.7,maxWidth:400,margin:"0 auto"}}>Track record data will appear here once the algorithm has completed at least one full trading day. Each day's results are published the following morning when the next day's picks are chosen.</div>
        </div>
      ) : (
        <div className="afu d3" style={{background:"var(--cd)",borderRadius:16,padding:22,border:"1px solid var(--bd)"}}><TT data={h}/></div>
      )}
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
