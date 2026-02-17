import { generateDailyPicks } from './_lib/generate.js';
import { todayKey, isMarketDay, previousTradingDay } from './_lib/date.js';

export default async function handler(req, res) {
  try {
    let key = todayKey();
    const marketOpen = isMarketDay(key);
    if (!marketOpen) key = previousTradingDay(key);
    const data = await generateDailyPicks(key);
    res.status(200).json({ ...data, marketOpen });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load daily picks', detail: String(e?.message || e) });
  }
}
