import { getTrackRecord, generateDailyPicks } from './_lib/generate.js';
import { todayKey, isMarketDay, previousTradingDay } from './_lib/date.js';

export default async function handler(req, res) {
  try {
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const limit = Number.parseInt(req.query.limit || '100', 10);

    // Ensure track records are built: trigger a lightweight pick generation
    // which builds track records from the previous day's picks as a side effect.
    // This handles the case where the user visits the track record page before
    // the cron or picks API has run today.
    try {
      let key = todayKey();
      if (!isMarketDay(key)) key = previousTradingDay(key);
      await generateDailyPicks(key, { force: false });
    } catch {
      // Non-critical — proceed with whatever track records exist
    }

    const rows = await getTrackRecord(category, Number.isFinite(limit) ? limit : 100);
    res.status(200).json({ rows });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load track record', detail: String(e?.message || e) });
  }
}
