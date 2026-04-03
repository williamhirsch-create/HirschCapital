import { getTrackRecord, generateDailyPicks } from './_lib/generate.js';
import { todayKey, isMarketDay, previousTradingDay } from './_lib/date.js';

// One-day backend force refresh (ET date) to keep track record in sync with forced daily regeneration.
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
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const limit = Number.parseInt(req.query.limit || '100', 10);
    const force = req.query.force === 'true' || getETDate() === FORCE_REFRESH_DATE;

    if (force) {
      let key = todayKey();
      if (!isMarketDay(key)) key = previousTradingDay(key);
      await generateDailyPicks(key, { force: true });
    }

    // Only serve track records that have already been built.
    // Track records are built as a side-effect of pick generation (cron or /api/today),
    // ensuring a day's results only appear after the next day's picks are chosen.
    const rows = await getTrackRecord(category, Number.isFinite(limit) ? limit : 100);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.status(200).json({ rows });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load track record', detail: String(e?.message || e) });
  }
}
