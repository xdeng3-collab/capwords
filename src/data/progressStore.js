import { STORAGE_KEYS, readJSON, writeJSON } from './storage';

// ==================== Streak ====================

export function getStreak() {
  return readJSON(STORAGE_KEYS.STREAK, { current: 0, longest: 0, lastActiveDate: null });
}

export function saveStreak(streak) {
  return writeJSON(STORAGE_KEYS.STREAK, streak);
}

// ==================== Words per day ====================
// A single map of day key -> words learned that day.

export async function getWordCountOn(day) {
  const counts = await readJSON(STORAGE_KEYS.DAILY_WORDS, {});
  return counts[day] || 0;
}

/** Add one word to `day` and return that day's new total. */
export async function incrementWordCountOn(day) {
  const counts = await readJSON(STORAGE_KEYS.DAILY_WORDS, {});
  counts[day] = (counts[day] || 0) + 1;
  await writeJSON(STORAGE_KEYS.DAILY_WORDS, counts);
  return counts[day];
}
