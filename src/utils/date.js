/**
 * Day keys ('YYYY-MM-DD') for everything counted per day: words learned, the
 * streak, the daily gift, cheers.
 *
 * These are UTC days, on purpose. The Supabase side decides whether a pal's
 * words_today is still "today" with (now() at time zone 'utc')::date, so the
 * phone has to cut days at the same moment or the two disagree for part of
 * every day. Change both together or neither.
 */
export function dayKey(date = new Date()) {
  return date.toISOString().split('T')[0];
}

export function todayKey() {
  return dayKey(new Date());
}

export function yesterdayKey() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return dayKey(date);
}

/**
 * The person's own calendar day ('YYYY-MM-DD' in local time), for display
 * only - grouping the sticker book, "today" / "yesterday" labels. Never use it
 * for anything counted; see dayKey() above for why those are UTC.
 */
export function localDayKey(date = new Date()) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Whole and fractional days between two dates (b - a). */
export function daysBetween(a, b) {
  return (new Date(b) - new Date(a)) / (1000 * 60 * 60 * 24);
}
