import { getTrackRecord } from './_lib/generate.js';

export default async function handler(req, res) {
  try {
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const limit = Number.parseInt(req.query.limit || '100', 10);
    const rows = await getTrackRecord(category, Number.isFinite(limit) ? limit : 100);
    res.status(200).json({ rows });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load track record', detail: String(e?.message || e) });
  }
}
