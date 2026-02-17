import { generateDailyPicks } from '../_lib/generate.js';
import { isLocalMidnight, todayKey } from '../_lib/date.js';

export default async function handler(req, res) {
  try {
    const secret = process.env.CRON_SECRET;
    if (secret && req.headers.authorization !== `Bearer ${secret}`) return res.status(401).json({ error: 'Unauthorized' });

    if (!isLocalMidnight()) return res.status(200).json({ ok: true, skipped: true, reason: 'Not local midnight window' });

    const data = await generateDailyPicks(todayKey());
    res.status(200).json({ ok: true, date: data.date, generated: true });
  } catch (e) {
    res.status(500).json({ error: 'Cron failed', detail: String(e?.message || e) });
  }
}
