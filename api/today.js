import { generateDailyPicks } from './_lib/generate.js';
import { todayKey, isMarketDay, previousTradingDay } from './_lib/date.js';

// One-time force refresh: on this date, every API call forces regeneration
const FORCE_REFRESH_DATE = '2026-02-26';

export default async function handler(req, res) {
  try {
    let key = todayKey();
    const marketOpen = isMarketDay(key);
    if (!marketOpen) key = previousTradingDay(key);
    const force = req.query.force === 'true' || key === FORCE_REFRESH_DATE;
    const rotate = req.query.rotate === 'true';
    const data = await generateDailyPicks(key, { force, rotate });
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.status(200).json({ ...data, marketOpen });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load daily picks', detail: String(e?.message || e) });
  }
}
