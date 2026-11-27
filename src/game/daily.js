// Daily ascents reset at midnight Eastern Time, the same moment for everyone.

export const EPOCH = '2026-11-01'; // Ascent #1

const fmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** YYYY-MM-DD for "today" in Eastern Time. */
export function todayKey(date = new Date()) {
  return fmt.format(date);
}

const DAY = 86400000;
const toUTC = (key) => Date.parse(`${key}T00:00:00Z`);

export function addDays(key, n) {
  return new Date(toUTC(key) + n * DAY).toISOString().slice(0, 10);
}

export function dayNumber(key) {
  return Math.round((toUTC(key) - toUTC(EPOCH)) / DAY) + 1;
}

export function isValidDay(key) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key || '')) return false;
  const n = dayNumber(key);
  return n >= 1 && key <= todayKey();
}

/** Every past day, newest first (excludes today). */
export function pastDays(today = todayKey()) {
  const out = [];
  for (let k = addDays(today, -1); k >= EPOCH; k = addDays(k, -1)) out.push(k);
  return out;
}

export function prettyDate(key) {
  const d = new Date(`${key}T12:00:00Z`);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}
