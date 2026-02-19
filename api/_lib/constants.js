export const SITE_TIMEZONE = process.env.SITE_TIMEZONE || 'America/New_York';

export const CATEGORIES = [
  { id: 'penny', label: 'Penny Stocks', minPrice: 0.1, maxPrice: 5 },
  { id: 'small', label: 'Small Cap', minCap: 3e8, maxCap: 2e9 },
  { id: 'mid', label: 'Mid Cap', minCap: 2e9, maxCap: 1e10 },
  { id: 'large', label: 'Large Cap', minCap: 1e10, maxCap: 2e11 },
  { id: 'hyper', label: 'Hyperscalers', minCap: 2e11 },
];

// Broad candidate universe per category — live data filters & validates each ticker
export const CANDIDATES = {
  penny: [
    { ticker: 'MVST', company: 'Microvast Holdings Inc', exchange: 'NASDAQ' },
    { ticker: 'BBAI', company: 'BigBear.ai Holdings', exchange: 'NYSE' },
    { ticker: 'SNDL', company: 'SNDL Inc', exchange: 'NASDAQ' },
    { ticker: 'CLOV', company: 'Clover Health Investments', exchange: 'NASDAQ' },
    { ticker: 'NKLA', company: 'Nikola Corporation', exchange: 'NASDAQ' },
    { ticker: 'WKHS', company: 'Workhorse Group Inc', exchange: 'NASDAQ' },
    { ticker: 'FCEL', company: 'FuelCell Energy Inc', exchange: 'NASDAQ' },
    { ticker: 'SKLZ', company: 'Skillz Inc', exchange: 'NYSE' },
    { ticker: 'GFAI', company: 'Guardforce AI Co', exchange: 'NASDAQ' },
    { ticker: 'BNGO', company: 'Bionano Genomics Inc', exchange: 'NASDAQ' },
    { ticker: 'PSNY', company: 'Polestar Automotive', exchange: 'NASDAQ' },
    { ticker: 'GOEV', company: 'Canoo Inc', exchange: 'NASDAQ' },
    { ticker: 'DNA', company: 'Ginkgo Bioworks', exchange: 'NYSE' },
    { ticker: 'PLUG', company: 'Plug Power Inc', exchange: 'NASDAQ' },
    { ticker: 'BIOR', company: 'Biora Therapeutics', exchange: 'NASDAQ' },
  ],
  small: [
    { ticker: 'IONQ', company: 'IonQ Inc', exchange: 'NYSE' },
    { ticker: 'UPST', company: 'Upstart Holdings Inc', exchange: 'NASDAQ' },
    { ticker: 'RKLB', company: 'Rocket Lab USA Inc', exchange: 'NASDAQ' },
    { ticker: 'JOBY', company: 'Joby Aviation Inc', exchange: 'NYSE' },
    { ticker: 'ASTS', company: 'AST SpaceMobile Inc', exchange: 'NASDAQ' },
    { ticker: 'MARA', company: 'Marathon Digital Holdings', exchange: 'NASDAQ' },
    { ticker: 'RIOT', company: 'Riot Platforms Inc', exchange: 'NASDAQ' },
    { ticker: 'OPEN', company: 'Opendoor Technologies', exchange: 'NASDAQ' },
    { ticker: 'STEM', company: 'Stem Inc', exchange: 'NYSE' },
    { ticker: 'MP', company: 'MP Materials Corp', exchange: 'NYSE' },
    { ticker: 'DM', company: 'Desktop Metal Inc', exchange: 'NYSE' },
    { ticker: 'RDW', company: 'Redwire Corporation', exchange: 'NYSE' },
    { ticker: 'AEHR', company: 'Aehr Test Systems', exchange: 'NASDAQ' },
    { ticker: 'CELH', company: 'Celsius Holdings Inc', exchange: 'NASDAQ' },
    { ticker: 'SOFI', company: 'SoFi Technologies Inc', exchange: 'NASDAQ' },
  ],
  mid: [
    { ticker: 'CRWD', company: 'CrowdStrike Holdings', exchange: 'NASDAQ' },
    { ticker: 'DDOG', company: 'Datadog Inc', exchange: 'NASDAQ' },
    { ticker: 'NET', company: 'Cloudflare Inc', exchange: 'NYSE' },
    { ticker: 'ZS', company: 'Zscaler Inc', exchange: 'NASDAQ' },
    { ticker: 'BILL', company: 'BILL Holdings Inc', exchange: 'NYSE' },
    { ticker: 'TWLO', company: 'Twilio Inc', exchange: 'NYSE' },
    { ticker: 'PATH', company: 'UiPath Inc', exchange: 'NYSE' },
    { ticker: 'HOOD', company: 'Robinhood Markets Inc', exchange: 'NASDAQ' },
    { ticker: 'AFRM', company: 'Affirm Holdings Inc', exchange: 'NASDAQ' },
    { ticker: 'GTLB', company: 'GitLab Inc', exchange: 'NASDAQ' },
    { ticker: 'CFLT', company: 'Confluent Inc', exchange: 'NASDAQ' },
    { ticker: 'DOCN', company: 'DigitalOcean Holdings', exchange: 'NYSE' },
    { ticker: 'U', company: 'Unity Software Inc', exchange: 'NYSE' },
    { ticker: 'SNAP', company: 'Snap Inc', exchange: 'NYSE' },
    { ticker: 'ROKU', company: 'Roku Inc', exchange: 'NASDAQ' },
  ],
  large: [
    { ticker: 'AMD', company: 'Advanced Micro Devices', exchange: 'NASDAQ' },
    { ticker: 'NFLX', company: 'Netflix Inc', exchange: 'NASDAQ' },
    { ticker: 'CRM', company: 'Salesforce Inc', exchange: 'NYSE' },
    { ticker: 'PYPL', company: 'PayPal Holdings Inc', exchange: 'NASDAQ' },
    { ticker: 'UBER', company: 'Uber Technologies Inc', exchange: 'NYSE' },
    { ticker: 'SHOP', company: 'Shopify Inc', exchange: 'NYSE' },
    { ticker: 'SQ', company: 'Block Inc', exchange: 'NYSE' },
    { ticker: 'COIN', company: 'Coinbase Global Inc', exchange: 'NASDAQ' },
    { ticker: 'ABNB', company: 'Airbnb Inc', exchange: 'NASDAQ' },
    { ticker: 'DASH', company: 'DoorDash Inc', exchange: 'NASDAQ' },
    { ticker: 'SNOW', company: 'Snowflake Inc', exchange: 'NYSE' },
    { ticker: 'SPOT', company: 'Spotify Technology', exchange: 'NYSE' },
    { ticker: 'PANW', company: 'Palo Alto Networks', exchange: 'NASDAQ' },
    { ticker: 'NOW', company: 'ServiceNow Inc', exchange: 'NYSE' },
    { ticker: 'MDB', company: 'MongoDB Inc', exchange: 'NASDAQ' },
  ],
  hyper: [
    { ticker: 'NVDA', company: 'NVIDIA Corporation', exchange: 'NASDAQ' },
    { ticker: 'MSFT', company: 'Microsoft Corporation', exchange: 'NASDAQ' },
    { ticker: 'AAPL', company: 'Apple Inc', exchange: 'NASDAQ' },
    { ticker: 'AMZN', company: 'Amazon.com Inc', exchange: 'NASDAQ' },
    { ticker: 'GOOGL', company: 'Alphabet Inc', exchange: 'NASDAQ' },
    { ticker: 'META', company: 'Meta Platforms Inc', exchange: 'NASDAQ' },
    { ticker: 'TSLA', company: 'Tesla Inc', exchange: 'NASDAQ' },
    { ticker: 'AVGO', company: 'Broadcom Inc', exchange: 'NASDAQ' },
    { ticker: 'LLY', company: 'Eli Lilly and Company', exchange: 'NYSE' },
    { ticker: 'V', company: 'Visa Inc', exchange: 'NYSE' },
    { ticker: 'MA', company: 'Mastercard Inc', exchange: 'NYSE' },
    { ticker: 'JPM', company: 'JPMorgan Chase & Co', exchange: 'NYSE' },
    { ticker: 'WMT', company: 'Walmart Inc', exchange: 'NYSE' },
    { ticker: 'UNH', company: 'UnitedHealth Group', exchange: 'NYSE' },
    { ticker: 'ORCL', company: 'Oracle Corporation', exchange: 'NYSE' },
  ],
};

// Signal labels per category — displayed in UI and used for thesis generation
export const SIGNAL_LABELS = {
  penny: ['Volatility (ATR%)', 'Volume Surge', 'Gap Catalyst', '5D Momentum', 'Volume Acceleration', 'Momentum (RSI)', 'Trend Position'],
  small: ['Volatility (ATR%)', 'Relative Volume', 'Gap Signal', '5D Momentum', 'Volume Trend', 'RSI Divergence', 'Technical Setup'],
  mid: ['Volatility Profile', 'Volume Flow', 'Gap Analysis', 'Momentum Score', 'Volume Trend', 'RSI Position', 'Breakout Signal'],
  large: ['Realized Volatility', 'Institutional Volume', 'Gap Assessment', 'Trend Strength', 'Volume Profile', 'RSI Level', 'Relative Strength'],
  hyper: ['Volatility Regime', 'Volume Dynamics', 'Gap Analysis', 'Trend Momentum', 'Volume Character', 'RSI Assessment', 'Trend Confirmation'],
};

// Category-specific scoring weights (sum to ~100)
export const SIGNAL_WEIGHTS = {
  penny: [22, 20, 14, 12, 10, 12, 10],
  small: [16, 18, 10, 16, 12, 14, 14],
  mid: [14, 16, 8, 14, 12, 16, 20],
  large: [10, 14, 8, 16, 12, 18, 22],
  hyper: [8, 12, 6, 18, 10, 20, 26],
};

// Algorithm version — bump to force regeneration when algorithm changes
export const ALGO_VERSION = 10;
