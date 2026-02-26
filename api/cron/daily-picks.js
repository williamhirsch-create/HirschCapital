import { generateDailyPicks, getNextTimeWindow } from '../_lib/generate.js';
import { isPreMarketWindow, todayKey, isMarketDay } from '../_lib/date.js';

export default async function handler(req, res) {
  try {
    const secret = process.env.CRON_SECRET;
    if (secret && req.headers.authorization !== `Bearer ${secret}`) return res.status(401).json({ error: 'Unauthorized' });

    // Only generate during the 7:00–10:45 AM ET window (covers pre-market + market open)
    if (!isPreMarketWindow()) return res.status(200).json({ ok: true, skipped: true, reason: 'Not in pre-market/market-open window (7:00–10:45 AM ET)' });

    const key = todayKey();
    if (!isMarketDay(key)) return res.status(200).json({ ok: true, skipped: true, reason: `Market closed on ${key}` });

    // Pre-gate detection: if we're within 10 minutes before a gate (8:30 or 9:30),
    // generate picks using the NEXT time window's exploration seeds.
    // This ensures picks are ready and cached BEFORE the gate fires,
    // so at 8:30/9:30 the frontend gets instant results with no regeneration.
    const nextWindow = getNextTimeWindow();
    const opts = { force: true };
    if (nextWindow) {
      opts.timeWindowOverride = nextWindow;
    }

    const data = await generateDailyPicks(key, opts);
    res.status(200).json({
      ok: true, date: data.date, generated: true,
      preGenerated: !!nextWindow,
      timeWindow: nextWindow || data._learning?.time_window,
      categories: Object.keys(data.picks || {}),
    });
  } catch (e) {
    res.status(500).json({ error: 'Cron failed', detail: String(e?.message || e) });
  }
}
