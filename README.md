# Hirsch Capital — Daily Volatility Picks

## Deploy to Vercel (3 steps)

### Option A: GitHub → Vercel (recommended)

1. **Push this folder to a GitHub repo:**
   ```bash
   cd hirsch-deploy
   git init
   git add .
   git commit -m "Initial commit"
   gh repo create hirsch-capital --public --push
   ```

2. **Connect to Vercel:**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your `hirsch-capital` GitHub repo
   - Vercel auto-detects Vite — just click **Deploy**

3. **Done!** Your site is live at `https://hirsch-capital.vercel.app`

## Local Development

```bash
npm install
npm run dev
```

## Daily pick generation (server-side)

- **Single source of truth date key:** `YYYY-MM-DD`.
- **Timezone:** `SITE_TIMEZONE` env var (default: `America/New_York`).
- **Cron:** `vercel.json` triggers `/api/cron/daily-picks` every hour (`0 * * * *`).
  - The cron endpoint only generates when local site time is exactly `00:00`.
  - This keeps scheduling timezone-safe while using Vercel UTC cron.
- **On-demand fallback:** `/api/today` generates today's picks if missing (idempotent).
- **Persistence:** server store keeps:
  - `daily_picks[date] = { date, timezone, picks, created_at }`
  - `track_record[]` rows (upserted by `{date, category, ticker}` to prevent duplicates)

## Track record computation

When a new date is generated:
1. Yesterday's picks are loaded from `daily_picks`.
2. Market candles are fetched server-side.
3. Track rows are upserted with:
   - `date`, `category`, `ticker`, `chosen_timestamp`
   - `reference_price`, `close`, `high`, `low`
   - `return_pct`, `max_run_up_pct`, `max_drawdown_pct`

Client reads only:
- `/api/today`
- `/api/track-record`

Heavy screening/scoring/scheduling/persistence logic remains server-side.

## Bundle-size note

No additional large UI/chart dependencies were introduced.
Charting continues to use existing Recharts and lazy-loading. Server logic stays in API routes so client bundle impact remains minimal.

## Disclaimer

Educational content only. Not investment advice.
