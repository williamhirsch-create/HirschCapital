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
  "2027-01-01","2027-01-18","2027-02-15","2027-03-26","2027-05-31","2027-06-18","2027-07-05","2027-09-06","2027-11-25","2027-12-24",
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

/** Check if current time is in the generation window (7:00 AM – 4:30 PM ET).
 *  Wide window ensures cron succeeds even with delays, across both EST and EDT.
 *  Covers pre-market refresh (8:30 AM), market-open refresh (9:30 AM),
 *  and afternoon runs that build track records from the day's closing data.
 *  The last cron run within the window overwrites earlier ones with fresher data. */
export const isPreMarketWindow = (date = new Date(), tz = SITE_TIMEZONE) => {
  const p = getNowInTzParts(date, tz);
  const h = parseInt(p.hour, 10);
  const m = parseInt(p.minute, 10);
  const totalMins = h * 60 + m;
  // 7:00 AM – 4:30 PM ET (570-minute window)
  // Covers pre-market (8:30 AM ET), market open (9:30 AM ET), and after-close (4:00 PM ET)
  return totalMins >= 420 && totalMins <= 990;
};
