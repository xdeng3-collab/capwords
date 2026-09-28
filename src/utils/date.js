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

/** Whole and fractional days between two dates (b - a). */
export function daysBetween(a, b) {
  return (new Date(b) - new Date(a)) / (1000 * 60 * 60 * 24);
}
