export const SITE_TIMEZONE = process.env.SITE_TIMEZONE || 'America/New_York';

export const CATEGORIES = [
  { id: 'penny', label: 'Penny Stocks', minPrice: 0.1, maxPrice: 5 },
  { id: 'small', label: 'Small Cap', minCap: 3e8, maxCap: 2e9 },
  { id: 'mid', label: 'Mid Cap', minCap: 2e9, maxCap: 1e10 },
  { id: 'large', label: 'Large Cap', minCap: 1e10, maxCap: 2e11 },
  { id: 'hyper', label: 'Hyperscalers', minCap: 2e11 },
];

export const CANDIDATES = {
  penny: [
    { ticker: 'MVST', company: 'Microvast Holdings Inc', exchange: 'NASDAQ', marketCap: 68000000, price: 1.47, atr_pct: 14.2, relative_volume: 4.1, short_interest: 18, gap_pct: 6.8, premarket_vol: '3.2M', thesis: 'Battery supplier with catalyst-heavy tape and squeeze profile.' },
    { ticker: 'BBAI', company: 'BigBear.ai', exchange: 'NYSE', marketCap: 210000000, price: 2.15, atr_pct: 10.8, relative_volume: 3.2, short_interest: 11, gap_pct: 4.4, premarket_vol: '2.4M', thesis: 'Defense/AI momentum with high intraday volatility behavior.' },
  ],
  small: [
    { ticker: 'IONQ', company: 'IonQ Inc', exchange: 'NYSE', marketCap: 1400000000, price: 33.4, atr_pct: 9.1, relative_volume: 3.8, short_interest: 12, gap_pct: 4.5, premarket_vol: '5.8M', thesis: 'Quantum beta + flow supports high-vol setup.' },
    { ticker: 'UPST', company: 'Upstart Holdings', exchange: 'NASDAQ', marketCap: 1800000000, price: 42.1, atr_pct: 8.2, relative_volume: 2.9, short_interest: 9, gap_pct: 3.2, premarket_vol: '3.7M', thesis: 'High-beta fintech with earnings sensitivity and momentum bursts.' },
  ],
  mid: [
    { ticker: 'CRWD', company: 'CrowdStrike Holdings', exchange: 'NASDAQ', marketCap: 8200000000, price: 148.2, atr_pct: 6.3, relative_volume: 2.9, short_interest: 5.2, gap_pct: 3.1, premarket_vol: '2.4M', thesis: 'Cybersecurity leadership with event-driven volatility.' },
    { ticker: 'DDOG', company: 'Datadog', exchange: 'NASDAQ', marketCap: 9400000000, price: 95.6, atr_pct: 5.7, relative_volume: 2.4, short_interest: 3.8, gap_pct: 2.4, premarket_vol: '1.8M', thesis: 'Cloud observability name with momentum-following flow.' },
  ],
  large: [
    { ticker: 'AMD', company: 'Advanced Micro Devices', exchange: 'NASDAQ', marketCap: 92000000000, price: 118.5, atr_pct: 4.8, relative_volume: 2.4, short_interest: 3.1, gap_pct: 2.8, premarket_vol: '8.2M', thesis: 'Semis momentum and AI positioning drive swing range.' },
    { ticker: 'NFLX', company: 'Netflix', exchange: 'NASDAQ', marketCap: 188000000000, price: 542.8, atr_pct: 3.9, relative_volume: 1.8, short_interest: 1.9, gap_pct: 1.7, premarket_vol: '1.1M', thesis: 'High-priced liquid name with post-earnings trend continuation.' },
  ],
  hyper: [
    { ticker: 'NVDA', company: 'NVIDIA Corporation', exchange: 'NASDAQ', marketCap: 1820000000000, price: 728.5, atr_pct: 3.2, relative_volume: 1.8, short_interest: 1.2, gap_pct: 1.9, premarket_vol: '6.1M', thesis: 'AI capex regime leader with persistent high-dollar volatility.' },
    { ticker: 'MSFT', company: 'Microsoft', exchange: 'NASDAQ', marketCap: 3120000000000, price: 412.8, atr_pct: 2.4, relative_volume: 1.3, short_interest: 0.8, gap_pct: 1.1, premarket_vol: '2.7M', thesis: 'Mega-cap liquidity anchor with cloud/AI trend catalyst.' },
  ],
};
