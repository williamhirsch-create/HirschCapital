import { generateDailyPicks } from '../_lib/generate.js';
import { isPreMarketWindow, todayKey, isMarketDay } from '../_lib/date.js';

export default async function handler(req, res) {
  try {
    const secret = process.env.CRON_SECRET;
    if (secret && req.headers.authorization !== `Bearer ${secret}`) return res.status(401).json({ error: 'Unauthorized' });

    // Only generate during the 8:15–8:45 AM ET pre-market window
    if (!isPreMarketWindow()) return res.status(200).json({ ok: true, skipped: true, reason: 'Not in pre-market window (8:15–8:45 AM ET)' });

    const key = todayKey();
    if (!isMarketDay(key)) return res.status(200).json({ ok: true, skipped: true, reason: `Market closed on ${key}` });

    // Force regeneration to ensure picks use the freshest pre-market data
    const data = await generateDailyPicks(key, { force: true });
    res.status(200).json({ ok: true, date: data.date, generated: true, categories: Object.keys(data.picks || {}) });
  } catch (e) {
    res.status(500).json({ error: 'Cron failed', detail: String(e?.message || e) });
  }
}
