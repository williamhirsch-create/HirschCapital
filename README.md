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

### Option B: Vercel CLI

```bash
cd hirsch-deploy
npm install
npx vercel
```

Follow the prompts. That's it.

## Local Development

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`

## Project Structure

```
hirsch-deploy/
├── index.html          ← HTML entry point
├── package.json        ← Dependencies (React, Recharts)
├── vite.config.js      ← Vite bundler config
├── vercel.json         ← SPA routing (prevents 404s!)
├── src/
│   ├── main.jsx        ← React mount point
│   └── App.jsx         ← The full Hirsch Capital app
└── README.md
```

## How the AI picks work

The app calls the Anthropic API (Claude) on page load to generate
a fresh stock pick with deep reasoning for each market cap tier.
If the API call fails, it falls back to pre-built demo picks.

No API key is needed in the artifact environment. If deploying
standalone, the API calls will gracefully fall back to demo data.

## Disclaimer

Educational content only. Not investment advice.
