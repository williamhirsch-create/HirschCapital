import { generateDailyPicks } from './_lib/generate.js';
import { todayKey } from './_lib/date.js';

export default async function handler(req, res) {
  try {
    const key = todayKey();
    const data = await generateDailyPicks(key);
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: 'Failed to load daily picks', detail: String(e?.message || e) });
  }
}
