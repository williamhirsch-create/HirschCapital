import { getTrackRecord } from './_lib/generate.js';

export default async function handler(req, res) {
  try {
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const limit = Number.parseInt(req.query.limit || '100', 10);

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
