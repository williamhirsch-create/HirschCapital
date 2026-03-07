import { generateDailyPicks } from './_lib/generate.js';
import { todayKey, isMarketDay, previousTradingDay } from './_lib/date.js';

// One-day backend force refresh (ET date) to ensure fresh regeneration regardless of cache layers.
const FORCE_REFRESH_DATE = '2026-03-07';

const getETDate = () => {
  try {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);
    const y = parts.find((p) => p.type === 'year')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    const d = parts.find((p) => p.type === 'day')?.value;
    return `${y}-${m}-${d}`;
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
};

export default async function handler(req, res) {
  try {
    let key = todayKey();
    const marketOpen = isMarketDay(key);
    if (!marketOpen) key = previousTradingDay(key);
    const force = req.query.force === 'true' || getETDate() === FORCE_REFRESH_DATE;
    const rotate = req.query.rotate === 'true';
    const data = await generateDailyPicks(key, { force, rotate });
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.status(200).json({ ...data, marketOpen });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load daily picks', detail: String(e?.message || e) });
  }
}
