import fs from 'node:fs/promises';
import path from 'node:path';

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;
const FILE_PATH = path.join(process.cwd(), '.data', 'hirsch-store.json');

const kvFetch = async (cmd) => {
  const r = await fetch(`${KV_URL}/${cmd.join('/')}`, { headers: { Authorization: `Bearer ${KV_TOKEN}` } });
  if (!r.ok) throw new Error(`KV error ${r.status}`);
  return r.json();
};

const readFileStore = async () => {
  try { return JSON.parse(await fs.readFile(FILE_PATH, 'utf8')); }
  catch { return { daily_picks: {}, track_record: [] }; }
};

const writeFileStore = async (data) => {
  await fs.mkdir(path.dirname(FILE_PATH), { recursive: true });
  await fs.writeFile(FILE_PATH, JSON.stringify(data, null, 2));
};

export const getStore = async () => {
  if (KV_URL && KV_TOKEN) {
    const d = await kvFetch(['get', 'hirsch_store']);
    return d?.result ? JSON.parse(d.result) : { daily_picks: {}, track_record: [] };
  }
  return readFileStore();
};

export const setStore = async (next) => {
  if (KV_URL && KV_TOKEN) {
    await kvFetch(['set', 'hirsch_store', encodeURIComponent(JSON.stringify(next))]);
    return;
  }
  await writeFileStore(next);
};

export const upsertTrackRow = (rows, row) => {
  const idx = rows.findIndex(r => r.date === row.date && r.category === row.category && r.ticker === row.ticker);
  if (idx >= 0) rows[idx] = row; else rows.push(row);
  return rows;
};
