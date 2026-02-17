import { SITE_TIMEZONE } from './constants.js';

export const getNowInTzParts = (date = new Date(), tz = SITE_TIMEZONE) => {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
  return parts;
};

export const todayKey = (date = new Date(), tz = SITE_TIMEZONE) => {
  const p = getNowInTzParts(date, tz);
  return `${p.year}-${p.month}-${p.day}`;
};

export const previousDateKey = (dateKey) => {
  const d = new Date(`${dateKey}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};

export const isLocalMidnight = (date = new Date(), tz = SITE_TIMEZONE) => {
  const p = getNowInTzParts(date, tz);
  return p.hour === '00' && p.minute === '00';
};
