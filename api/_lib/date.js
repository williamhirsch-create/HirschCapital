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

const US_MKT_HOLIDAYS = new Set([
  "2025-01-01","2025-01-20","2025-02-17","2025-04-18","2025-05-26","2025-06-19","2025-07-04","2025-09-01","2025-11-27","2025-12-25",
  "2026-01-01","2026-01-19","2026-02-16","2026-04-03","2026-05-25","2026-06-19","2026-07-03","2026-09-07","2026-11-26","2026-12-25",
]);

export const isMarketDay = (dateKey) => {
  const d = new Date(`${dateKey}T12:00:00Z`);
  const day = d.getUTCDay();
  if (day === 0 || day === 6) return false;
  return !US_MKT_HOLIDAYS.has(dateKey);
};

export const previousTradingDay = (dateKey) => {
  const d = new Date(`${dateKey}T12:00:00Z`);
  let guard = 0;
  do { d.setUTCDate(d.getUTCDate() - 1); guard++; } while (!isMarketDay(d.toISOString().slice(0, 10)) && guard < 10);
  return d.toISOString().slice(0, 10);
};

export const previousDateKey = (dateKey) => {
  return previousTradingDay(dateKey);
};

export const isLocalMidnight = (date = new Date(), tz = SITE_TIMEZONE) => {
  const p = getNowInTzParts(date, tz);
  const h = parseInt(p.hour, 10);
  const m = parseInt(p.minute, 10);
  // 30-minute window: 23:45–00:15 to handle cron timing variance
  return (h === 23 && m >= 45) || (h === 0 && m <= 15);
};

/** Check if current time is in the pre-market generation window (8:15–8:45 AM ET).
 *  This runs 45 minutes before market open (9:30 AM) so picks use fresh pre-market data. */
export const isPreMarketWindow = (date = new Date(), tz = SITE_TIMEZONE) => {
  const p = getNowInTzParts(date, tz);
  const h = parseInt(p.hour, 10);
  const m = parseInt(p.minute, 10);
  // 30-minute window: 8:15–8:45 AM to handle cron timing variance around 8:30 AM
  return h === 8 && m >= 15 && m <= 45;
};
