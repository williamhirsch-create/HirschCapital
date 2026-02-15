import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ComposedChart, Bar, CartesianGrid, Line } from "recharts";

const CATS = [
  { id: "penny", label: "Penny Stocks", short: "Penny", color: "#FF4757", range: "$0.10-$5", crit: "Price < $5, micro-cap", icon: "⚡" },
  { id: "small", label: "Small Cap", short: "Small", color: "#0066FF", range: "$5-$50", crit: "$300M-$2B mkt cap", icon: "🔹" },
  { id: "mid", label: "Mid Cap", short: "Mid", color: "#8B5CF6", range: "$20-$150", crit: "$2B-$10B mkt cap", icon: "🔷" },
  { id: "large", label: "Large Cap", short: "Large", color: "#F59E0B", range: "$50-$500", crit: "$10B-$200B mkt cap", icon: "🟡" },
  { id: "hyper", label: "Hyperscalers", short: "Hyper", color: "#00C48C", range: "$100-$1000+", crit: "$200B+ tech giants", icon: "🚀" },
];

const SIGS = {
  penny: ["14-Day ATR%","Relative Volume","Premarket Gap","5D Momentum","Float Utilization","News Catalyst","Short Interest"],
  small: ["14-Day ATR%","Relative Volume","Earnings Proximity","RSI Divergence","Institutional Flow","Sector Momentum","Short Squeeze"],
  mid: ["Implied Vol","Options Flow","Earnings Surprise","Revenue Growth","Analyst Revisions","Sector Rotation","Technical Breakout"],
  large: ["Gamma Exposure","Dark Pool Activity","Earnings Whisper","Dividend Shift","Buyback Activity","Macro Sensitivity","Relative Strength"],
  hyper: ["AI Capex Trend","Cloud Rev Growth","Index Flow","Regulatory Risk","Macro Sensitivity","Moat Score","Earnings Power"],
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

const FB = {
  penny:{ticker:"MVST",company:"Microvast Holdings Inc",exchange:"NASDAQ",price:1.47,change_pct:12.3,market_cap:"68M",avg_volume:"8.4M",relative_volume:4.1,atr_pct:14.2,float_val:"22M",short_interest:"18%",gap_pct:6.8,premarket_vol:"3.2M",hirsch_score:86,thesis_summary:"Unusual premarket volume surge signals potential institutional accumulation|14-day ATR at 14.2% indicates heightened volatility regime favorable for intraday moves|Short interest at 18% with low float creates squeeze potential if buying pressure sustains|Recent SEC 8-K filing suggests potential partnership announcement — catalyst proximity elevated",catalysts:"MVST has shown accumulation over the past five sessions with escalating volume. Today's premarket activity is notable — volume reached 38% of full-day average before the bell. The company's 8-K filing references 'material definitive agreements.'\n\nThe broader EV battery sector is seeing rotation with peers showing elevated flows this week. MVST's positioning as a commercial vehicle battery supplier with existing revenue differentiates it from pure-play development-stage peers.",upside_drivers:"Primary upside mechanism is a short squeeze catalyzed by the 8-K filing. With 18% SI against 22M float, covering could amplify buying pressure significantly. The stock sits below $1.55 resistance — a breakout could trigger technical buying from momentum algorithms.",key_levels:"Support at $1.32 (5-day VWAP). Resistance at $1.55 (prior swing high). Breakout target $1.78 if $1.55 clears with volume above 12M shares.",risks:"Dilution risk — history of shelf offerings|Low float manipulation susceptibility|8-K may contain negative terms like debt conversion|Trading halt risk on rapid price moves",invalidation:"Price breaks below $1.32 on volume above 5M|Relative volume fades below 2.0x by 10:30 AM|8-K reveals dilutive offering terms",signal_values:"14.2%|4.1x|+6.8%|+22.4%|72%|8-K Filing|18.3%",signal_weights:"20|18|15|12|10|15|10",signal_reasons:"ATR in top 5% of penny universe|4.1x volume signals smart money interest|Gap suggests overnight catalyst absorption|Strong 5D trend with higher lows|Float supply significantly constrained|Binary catalyst proximity from SEC filing|Elevated squeeze potential if thesis holds",what_it_is:"Microvast Holdings designs and manufactures lithium-ion battery solutions for commercial and specialty vehicles in the electric vehicle market."},
  small:{ticker:"IONQ",company:"IonQ Inc",exchange:"NYSE",price:33.40,change_pct:8.7,market_cap:"1.4B",avg_volume:"15.2M",relative_volume:3.8,atr_pct:9.1,float_val:"45M",short_interest:"12%",gap_pct:4.5,premarket_vol:"5.8M",hirsch_score:87,thesis_summary:"Quantum computing sector seeing renewed institutional interest after government funding|Partnership with major cloud provider imminent per recent filings|RSI divergence signals momentum shift from oversold|Institutional flow shows accumulation over past week",catalysts:"IonQ has been building momentum following positive developments in quantum computing. Recent government funding announcements have lifted the sector.\n\nThe latest 10-Q hints at expanded cloud partnerships. Analyst consensus shifted positive with two upgrades this week.",upside_drivers:"Sector tailwinds, institutional accumulation, and potential partnership news creates a multi-catalyst setup. Short interest at 12% provides additional squeeze fuel if the stock breaks through resistance levels.",key_levels:"Support at $30.80 (20-day MA). Resistance at $36.50. Breakout target $42 on volume confirmation.",risks:"Quantum computing pre-revenue — valuation risk|Sector sell-off could override individual catalysts|Government funding may face political headwinds|High beta with significant drawdown potential",invalidation:"Price closes below $30.80|Sector peers reverse sharply|Relative volume fades below 1.5x",signal_values:"9.1%|3.8x|Near earnings|Bullish divergence|+$42M inflow|+18% sector|12.3%",signal_weights:"15|18|15|12|15|15|10",signal_reasons:"Elevated volatility in favorable regime|Significant volume surge detected|Earnings proximity creates catalyst window|RSI showing bullish divergence pattern|Net institutional inflows positive|Quantum sector rotating in strongly|Moderate but actionable squeeze setup",what_it_is:"IonQ builds general-purpose trapped-ion quantum computers accessible via major cloud platforms like AWS and Azure."},
  mid:{ticker:"CRWD",company:"CrowdStrike Holdings",exchange:"NASDAQ",price:148.20,change_pct:5.8,market_cap:"8.2B",avg_volume:"6.8M",relative_volume:2.9,atr_pct:6.3,float_val:"120M",short_interest:"5.2%",gap_pct:3.1,premarket_vol:"2.4M",hirsch_score:86,thesis_summary:"Cybersecurity spending entering acceleration phase post-breach cycle|Heavy call buying at $155 and $160 strikes signals informed positioning|Revenue beat whisper numbers in channel partner checks|Technical breakout forming above 200-day moving average",catalysts:"CrowdStrike benefits from accelerating cybersecurity budgets following high-profile breaches. Channel checks suggest expanding deal sizes.\n\nThe options market is pricing significant upside with unusual call volume at higher strikes, suggesting informed participants expect near-term appreciation.",upside_drivers:"Budget acceleration combined with technical breakout and options flow creates high conviction. Gamma exposure at $155 could accelerate moves if reached through dealer hedging dynamics.",key_levels:"Support at $142 (200-day MA). Resistance at $155 (options concentration). Breakout target $168 on sustained volume.",risks:"Broad tech sell-off risk could override thesis|Competitive pressure from Palo Alto Networks|Valuation stretched on forward earnings multiples|Post-outage reputation concerns may linger",invalidation:"Price fails to hold $142 support|Call options volume normalizes to baseline|Broad tech sector sells off sharply",signal_values:"32% IV|Heavy $155 calls|Beat 3 of 4Q|+28% YoY|+4 upgrades|Cyber in rotation|Above 200DMA",signal_weights:"18|20|12|15|10|15|10",signal_reasons:"Elevated IV signals expected large move|Unusual bullish options positioning detected|Consistent earnings surprise history|Strong revenue growth trajectory|Analyst consensus shifting higher|Cybersecurity sector seeing fund inflows|Technical confirmation above key MA",what_it_is:"CrowdStrike is a cybersecurity technology company providing cloud-delivered endpoint and workload protection platforms."},
  large:{ticker:"AMD",company:"Advanced Micro Devices",exchange:"NASDAQ",price:118.50,change_pct:6.6,market_cap:"92B",avg_volume:"52M",relative_volume:2.4,atr_pct:4.8,float_val:"1.2B",short_interest:"3.1%",gap_pct:2.8,premarket_vol:"8.2M",hirsch_score:88,thesis_summary:"AI chip demand shows no slowing — AMD positioned as key NVIDIA alternative|MI300X shipments exceeding forecasts per supply chain checks|Options gamma concentrated at $120 — breakout triggers dealer hedging|Data center revenue mix improving margin profile significantly",catalysts:"AMD's MI300X AI accelerator is gaining traction faster than expected. Supply chain checks indicate production ramping ahead of schedule with major cloud providers expanding AMD allocations.\n\nThe company's positioning as the primary alternative to NVIDIA in AI training gives leverage as customers seek to diversify their chip supply chains.",upside_drivers:"Gamma exposure at $120 creates acceleration zone. If the stock clears this level with volume, dealer hedging flows could push toward $130 rapidly. AI narrative provides fundamental support for sustained buying.",key_levels:"Support at $112 (50-day MA). Key gamma level at $120. Target $132 on confirmed breakout with volume.",risks:"NVIDIA competitive dominance could limit market share gains|Semiconductor cycle risk in downturn|China revenue exposure to tightening export controls|High expectations may already be reflected in price",invalidation:"Price fails at $120 resistance on two attempts|SOX semiconductor index breaks down|MI300X supply chain checks turn negative",signal_values:"At $120 strike|2.4x dark pool|Beat by $0.08|N/A|$4B buyback|High beta to rates|Top 10% RS",signal_weights:"20|15|12|8|10|15|20",signal_reasons:"Gamma wall creates potential price acceleration|Above-average institutional dark pool activity|Consistent earnings beat pattern supports thesis|No dividend factor for this stock|Active buyback program supports share price|Macro rate sensitivity is manageable|Strong relative strength vs semiconductor peers",what_it_is:"AMD designs and manufactures semiconductors including CPUs, GPUs, and AI accelerators for data center, gaming, and embedded applications."},
  hyper:{ticker:"NVDA",company:"NVIDIA Corporation",exchange:"NASDAQ",price:728.50,change_pct:3.8,market_cap:"1.82T",avg_volume:"42M",relative_volume:1.8,atr_pct:3.2,float_val:"2.4B",short_interest:"1.2%",gap_pct:1.9,premarket_vol:"6.1M",hirsch_score:91,thesis_summary:"All major hyperscalers guided AI capex higher — unanimously bullish through 2026|Blackwell architecture demand exceeding supply by estimated 3-4x ratio|Cloud concentration risk offset by emerging sovereign AI demand vector|Weekly chart maintains higher lows — technical momentum fully intact",catalysts:"NVIDIA continues benefiting from unprecedented AI infrastructure demand. All major hyperscalers (Microsoft, Google, Amazon, Meta) guided capex higher in recent earnings calls, directly supporting NVIDIA's revenue trajectory.\n\nBlackwell GPU demand far exceeds supply capacity. Management commentary suggests supply constraints persist through at least mid-2026, supporting pricing power and forward visibility.",upside_drivers:"Convergence of hyperscaler capex expansion, Blackwell demand, and sovereign AI spending creates multiple independent demand vectors. Any positive supply chain development or major new customer announcement could catalyze the next significant leg higher.",key_levels:"Support at $695 (20-day MA). Psychological resistance at $750. Breakout target $800+ on sustained institutional volume.",risks:"Customer concentration — top hyperscalers represent significant revenue share|Regulatory risk from potential export control expansion|Premium valuation requires sustained growth execution|Competitive threats from custom silicon (TPU, Trainium, etc.)",invalidation:"Price breaks below $695 on heavy institutional volume|Any major hyperscaler guides capex lower|Export control expansion announced targeting AI chips|Blackwell yield or production issues surface",signal_values:"+35% YoY capex|+122% YoY|1.8x index|Moderate|Low beta|9.5/10|42x fwd",signal_weights:"22|20|12|8|10|18|10",signal_reasons:"Hyperscaler capex directly drives NVIDIA revenue growth|Cloud revenue acceleration sustains premium valuation|Index fund flows remain supportive of price|Regulatory environment currently manageable|Demonstrated macro resilience through rate cycles|Near-impenetrable competitive moat in AI training|Earnings power ratio supports current multiple",what_it_is:"NVIDIA is the dominant designer of GPUs and AI accelerators powering the global buildout of data centers, AI training infrastructure, gaming, and autonomous systems."},
};

const gP = (b, n, v = .03) => { const d = []; let p = b; const now = new Date(); for (let i = n; i >= 0; i--) { const dt = new Date(now); dt.setDate(dt.getDate() - i); p = Math.max(b * .5, p + (Math.random() - .45) * v * p); d.push({ date: dt.toLocaleDateString("en-US", { month: "short", day: "numeric" }), price: +p.toFixed(2), volume: Math.floor(Math.random() * 8e6 + 2e6) }); } return d; };
const gI = (o) => { const d = []; let p = o; for (let i = 0; i < 78; i++) { const h = 9 + Math.floor((i * 5 + 30) / 60), m = (i * 5 + 30) % 60; p = Math.max(o * .85, p + (Math.random() - .42) * .015 * p); d.push({ time: `${h}:${m.toString().padStart(2, "0")}`, price: +p.toFixed(2), volume: Math.floor(Math.random() * 5e5 + 1e5), vwap: +(p * (.98 + Math.random() * .04)).toFixed(2) }); } return d; };

const CSS = `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap');
:root{--bg:#FAFAF8;--cd:#FFF;--dk:#0C0F14;--tx:#1A1D23;--mu:#6B7280;--ac:#0066FF;--al:#E8F0FE;--gn:#00C48C;--gl:#E6FAF3;--rd:#FF4757;--rl:#FFF0F1;--am:#F59E0B;--aml:#FEF3C7;--bd:#E8E8E4}
*{margin:0;padding:0;box-sizing:border-box}
.fs{font-family:'DM Sans',-apple-system,sans-serif}.ff{font-family:'Playfair Display',Georgia,serif}
@keyframes fu{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes si{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}
@keyframes sp{to{transform:rotate(360deg)}}
@keyframes pu{0%,100%{opacity:1}50%{opacity:.5}}
@keyframes sh{0%{background-position:-200% 0}100%{background-position:200% 0}}
.afu{animation:fu .6s ease forwards}.asi{animation:si .5s ease forwards}
.d1{animation-delay:.1s;opacity:0}.d2{animation-delay:.2s;opacity:0}.d3{animation-delay:.3s;opacity:0}.d4{animation-delay:.4s;opacity:0}
.sk{background:linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%);background-size:200% 100%;animation:sh 1.5s infinite;border-radius:8px}
.ld{width:8px;height:8px;border-radius:50%;background:var(--gn);animation:pu 2s infinite;display:inline-block}
.ct{display:flex;gap:5px;overflow-x:auto;padding:4px;background:#F3F4F6;border-radius:14px}
.ct::-webkit-scrollbar{display:none}
.cb{padding:10px 16px;border-radius:10px;border:none;cursor:pointer;font-size:13px;font-weight:500;white-space:nowrap;transition:all .2s;display:flex;align-items:center;gap:6px;background:transparent;color:var(--mu)}
.cb.on{background:#fff;font-weight:700;box-shadow:0 2px 8px rgba(0,0,0,.06)}
@media(max-width:768px){.dn{display:none!important}.mb{display:flex!important}.mg{grid-template-columns:repeat(2,1fr)!important}}`;

const Tip = ({ active, payload, label }) => { if (!active || !payload?.length) return null; return (<div style={{ background: "#0C0F14", color: "#fff", padding: "10px 14px", borderRadius: 10, fontSize: 13, fontFamily: "'DM Sans'", boxShadow: "0 8px 32px rgba(0,0,0,.3)" }}><div style={{ color: "#9CA3AF", marginBottom: 4 }}>{label}</div>{payload.map((p, i) => (<div key={i} style={{ color: p.color || "#00C48C", fontWeight: 600 }}>{p.name}: {typeof p.value === "number" ? (p.name === "volume" ? (p.value / 1e6).toFixed(1) + "M" : "$" + p.value.toFixed(2)) : p.value}</div>))}</div>); };

export default function App() {
  const [pg, setPg] = useState("home");
  const [ac, setAc] = useState("penny");
  const [picks, setP] = useState({});
  const [charts, setCh] = useState({});
  const [ld2, setLd] = useState(null);
  const [tf, setTf] = useState("1D");
  const [sc, setSc] = useState(false);
  const [mm, setMm] = useState(false);

  useEffect(() => { const h = () => setSc(window.scrollY > 20); window.addEventListener("scroll", h); return () => window.removeEventListener("scroll", h); }, []);

  const gen = async (id) => {
    if (picks[id]) return; setLd(id);
    const cat = CATS.find(c => c.id === id);
    const bp = id==="penny"?1+Math.random()*3:id==="small"?10+Math.random()*35:id==="mid"?40+Math.random()*100:id==="large"?80+Math.random()*300:150+Math.random()*600;
    const v = id==="penny"?.05:id==="small"?.035:.02;
    setCh(p => ({...p,[id]:{"1D":gI(bp),"5D":gP(bp,5,v),"1M":gP(bp,30,v*.8),"6M":gP(bp,180,v*.6),"1Y":gP(bp,365,v*.5)}}));
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, messages: [{ role: "user",
          content: `You are the Hirsch Capital quant algorithm. Today: ${new Date().toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}. Generate today's ${cat.label} pick (${cat.crit}, ${cat.range}). Signals: ${SIGS[id].join(", ")}. Return ONLY JSON (no markdown): {"ticker":"XXXX","company":"Name","exchange":"NASDAQ","price":${bp.toFixed(2)},"change_pct":5.2,"market_cap":"45M","avg_volume":"12M","relative_volume":3.2,"atr_pct":8.5,"float_val":"22M","short_interest":"14%","gap_pct":4.2,"premarket_vol":"2.1M","hirsch_score":84,"thesis_summary":"b1|b2|b3|b4","catalysts":"P1\\n\\nP2","upside_drivers":"Detail","key_levels":"Levels","risks":"r1|r2|r3","invalidation":"t1|t2|t3","signal_values":"v1|v2|v3|v4|v5|v6|v7","signal_weights":"w1|w2|w3|w4|w5|w6|w7","signal_reasons":"r1|r2|r3|r4|r5|r6|r7","what_it_is":"Desc"} Pick a real stock. Sophisticated quant analysis. Probabilistic language. Weights sum to 100.`
        }]})
      });
      const d = await r.json(); const t = d.content?.map(i=>i.text||"").join("\n")||"";
      setP(p => ({...p,[id]:JSON.parse(t.replace(/```json|```/g,"").trim())}));
    } catch { setP(p => ({...p,[id]:FB[id]})); }
    setLd(null);
  };

  useEffect(() => { gen("penny"); }, []);
  useEffect(() => { gen(ac); }, [ac]);

  const pk = picks[ac]; const cc = (charts[ac]||{})[tf]||[]; const cat = CATS.find(c=>c.id===ac);
  const sigs = SIGS[ac]||[]; const hist = HIST[ac]||[]; const isLd = ld2===ac&&!pk;

  const Tabs = ({s}) => (<div className="ct fs" style={s}>{CATS.map(c=>(<button key={c.id} className={`cb${ac===c.id?" on":""}`} onClick={()=>{setAc(c.id);setTf("1D");}} style={ac===c.id?{color:c.color}:{}}><span>{c.icon}</span>{c.short}</button>))}</div>);
  const Disc = () => (<div style={{background:"var(--aml)",borderLeft:"4px solid var(--am)",padding:"12px 18px",borderRadius:"0 8px 8px 0",fontSize:13,color:"#92400E",lineHeight:1.6}} className="fs">⚠️ <strong>Educational content only.</strong> Hirsch Capital does not provide investment advice. All equities carry risk. Past performance is not predictive.</div>);

  const TT = ({data,limit}) => (<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}} className="fs"><thead><tr style={{borderBottom:"2px solid var(--bd)"}}>{["Date","Ticker","Entry","Close","High","Low","Return","Max Run","Score"].map(h=>(<th key={h} style={{padding:"10px",textAlign:"left",fontSize:11,fontWeight:600,color:"var(--mu)",textTransform:"uppercase",letterSpacing:".06em"}}>{h}</th>))}</tr></thead><tbody>{(data||[]).slice(0,limit||999).map((p,i)=>{const ret=((p.c-p.e)/p.e*100).toFixed(1);const mr=((p.h-p.e)/p.e*100).toFixed(1);return(<tr key={i} style={{borderBottom:"1px solid var(--bd)"}} onMouseEnter={e=>e.currentTarget.style.background="#F9FAFB"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}><td style={{padding:"11px 10px",fontSize:13,color:"var(--mu)"}}>{p.d}</td><td style={{padding:"11px 10px",fontSize:14,fontWeight:700}}>{p.t}</td><td style={{padding:"11px 10px",fontSize:13}}>${p.e.toFixed(2)}</td><td style={{padding:"11px 10px",fontSize:13}}>${p.c.toFixed(2)}</td><td style={{padding:"11px 10px",fontSize:13,color:"var(--gn)"}}>${p.h.toFixed(2)}</td><td style={{padding:"11px 10px",fontSize:13,color:"var(--rd)"}}>${p.l.toFixed(2)}</td><td style={{padding:"11px 10px",fontSize:13,fontWeight:600,color:ret>=0?"var(--gn)":"var(--rd)"}}>{ret>=0?"+":""}{ret}%</td><td style={{padding:"11px 10px",fontSize:13,fontWeight:600,color:"var(--gn)"}}>+{mr}%</td><td style={{padding:"11px 10px"}}><span style={{background:p.s>=80?"var(--gl)":"var(--al)",color:p.s>=80?"var(--gn)":"var(--ac)",padding:"3px 10px",borderRadius:6,fontSize:12,fontWeight:600}}>{p.s}</span></td></tr>);})}</tbody></table></div>);

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
        <div className="afu" style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(0,196,140,.1)",border:"1px solid rgba(0,196,140,.2)",borderRadius:100,padding:"6px 16px",marginBottom:28}}>
          <span className="ld"/><span style={{color:"var(--gn)",fontSize:13,fontWeight:500}} className="fs">Market Open — 5 Categories Live</span>
        </div>
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
  const Pick = () => {
    if(isLd||!pk) return(<div style={{maxWidth:940,margin:"120px auto",padding:"0 24px"}}><div className="sk" style={{height:36,width:200,marginBottom:12}}/><div className="sk" style={{height:20,width:300,marginBottom:32}}/><div className="sk" style={{height:350,marginBottom:20}}/></div>);
    const sb=pk.thesis_summary?.split("|")||[];const rk=pk.risks?.split("|")||[];const iv=pk.invalidation?.split("|")||[];
    const sv=pk.signal_values?.split("|")||[];const sw=pk.signal_weights?.split("|")||[];const sr=pk.signal_reasons?.split("|")||[];
    return(<div style={{maxWidth:940,margin:"0 auto",padding:"100px 24px 60px"}}>
      <Tabs s={{marginBottom:28}}/>
      <div className="afu">
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}><span className="ld"/><span className="fs" style={{fontSize:12,color:cat.color,fontWeight:600,letterSpacing:".08em",textTransform:"uppercase"}}>{cat.label} Pick — {new Date().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}</span></div>
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
        <div style={{height:300}}><ResponsiveContainer width="100%" height="100%"><ComposedChart data={cc} margin={{top:5,right:5,bottom:5,left:5}}>
          <defs><linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={cat.color} stopOpacity={.12}/><stop offset="100%" stopColor={cat.color} stopOpacity={0}/></linearGradient></defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false}/>
          <XAxis dataKey={tf==="1D"?"time":"date"} axisLine={false} tickLine={false} tick={{fontSize:11,fill:"#9CA3AF"}} interval={tf==="1D"?12:"preserveStartEnd"}/>
          <YAxis domain={["auto","auto"]} axisLine={false} tickLine={false} tick={{fontSize:11,fill:"#9CA3AF"}} tickFormatter={v=>`$${v.toFixed(v<10?2:0)}`} width={55}/>
          <Tooltip content={<Tip/>}/>
          <Area type="monotone" dataKey="price" stroke={cat.color} strokeWidth={2.5} fill="url(#pg)" dot={false} name="price"/>
          {tf==="1D"&&<Line type="monotone" dataKey="vwap" stroke="var(--am)" strokeWidth={1.5} strokeDasharray="5 5" dot={false} name="VWAP"/>}
          <Bar dataKey="volume" fill={`${cat.color}15`} yAxisId="vol" name="volume"/>
          <YAxis yAxisId="vol" orientation="right" hide domain={[0,d=>d*5]}/>
        </ComposedChart></ResponsiveContainer></div>
      </div>

      {/* METRICS */}
      <div className="afu d2 mg" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,marginTop:18}}>
        {[{l:"Market Cap",v:pk.market_cap},{l:"Avg Volume",v:pk.avg_volume},{l:"Rel. Volume",v:`${pk.relative_volume}x`},{l:"14D ATR%",v:pk.atr_pct+"%"},{l:"Float",v:pk.float_val||pk.float},{l:"Short Interest",v:pk.short_interest},{l:"Gap %",v:`+${pk.gap_pct}%`},{l:"Pre-Mkt Vol",v:pk.premarket_vol}].map((m,i)=>(<div key={i} style={{background:"var(--cd)",borderRadius:12,padding:"12px 14px",border:"1px solid var(--bd)"}}><div className="fs" style={{fontSize:10,color:"var(--mu)",marginBottom:3,fontWeight:600,textTransform:"uppercase",letterSpacing:".06em"}}>{m.l}</div><div className="fs" style={{fontSize:17,fontWeight:700}}>{m.v}</div></div>))}
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
    const h=HIST[ac]||[];const w=h.filter(p=>p.c>p.e).length;
    const ar=h.length?(h.reduce((a,p)=>a+((p.c-p.e)/p.e*100),0)/h.length).toFixed(1):"0";
    const mr2=h.length?(h.reduce((a,p)=>a+((p.h-p.e)/p.e*100),0)/h.length).toFixed(1):"0";
    return(<div style={{maxWidth:1000,margin:"0 auto",padding:"100px 24px 60px"}}>
      <h1 className="ff afu" style={{fontSize:40,marginBottom:6,letterSpacing:"-.02em"}}>Track Record</h1>
      <p className="fs afu d1" style={{color:"var(--mu)",marginBottom:24}}>Full transparency — wins and losses.</p>
      <Tabs s={{marginBottom:24}}/><Disc/>
      <div className="afu d2" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:14,margin:"24px 0"}}>
        {[{l:"Win Rate",v:`${h.length?((w/h.length)*100).toFixed(0):0}%`,s:`${w}/${h.length}`,c:"var(--gn)"},{l:"Avg Return",v:`${ar}%`,s:"Entry to close",c:ar>=0?"var(--gn)":"var(--rd)"},{l:"Avg Max Run",v:`+${mr2}%`,s:"Entry to high",c:"var(--gn)"},{l:"Total Picks",v:h.length,s:cat.label,c:cat.color}].map((s,i)=>(<div key={i} style={{background:"var(--cd)",borderRadius:14,padding:20,border:"1px solid var(--bd)"}}><div className="fs" style={{fontSize:10,fontWeight:600,color:"var(--mu)",textTransform:"uppercase",letterSpacing:".08em",marginBottom:6}}>{s.l}</div><div className="fs" style={{fontSize:26,fontWeight:700,color:s.c}}>{s.v}</div><div className="fs" style={{fontSize:12,color:"var(--mu)",marginTop:2}}>{s.s}</div></div>))}
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
      <div style={{borderTop:"1px solid rgba(255,255,255,.08)",paddingTop:20}}><p className="fs" style={{color:"#4B5563",fontSize:11,lineHeight:1.7,marginBottom:6}}>Educational content only. Not investment advice. All equities carry risk. Past performance is not predictive.</p><p className="fs" style={{color:"#374151",fontSize:11}}>© 2025 Hirsch Capital</p></div>
    </div>
  </footer>);

  return(<div className="fs" style={{background:"var(--bg)",minHeight:"100vh",color:"var(--tx)"}}>
    <style>{CSS}</style><Nav/>
    {pg==="home"&&<Home/>}{pg==="pick"&&<Pick/>}{pg==="track"&&<Track/>}{pg==="method"&&<Method/>}{pg==="about"&&<About/>}
    <Foot/>
    {ld2&&<div style={{position:"fixed",bottom:24,right:24,zIndex:200,background:"var(--dk)",color:"#fff",padding:"12px 20px",borderRadius:12,display:"flex",alignItems:"center",gap:10,boxShadow:"0 8px 32px rgba(0,0,0,.3)"}}><div style={{width:14,height:14,border:"2px solid rgba(255,255,255,.2)",borderTopColor:"#fff",borderRadius:"50%",animation:"sp .8s linear infinite"}}/><span className="fs" style={{fontSize:13}}>Generating {CATS.find(c=>c.id===ld2)?.label} pick...</span></div>}
  </div>);
}
