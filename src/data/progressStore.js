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

/** Every day key -> words learned that day. */
export function getAllWordCounts() {
  return readJSON(STORAGE_KEYS.DAILY_WORDS, {});
}

// ==================== Sea journey ====================
// `reached` is the furthest island earned, `landed` the one the buddy has
// been shown hopping onto. They differ for the moment between meeting the
// goal and opening the home screen, which is when the jump plays.
// `lastGoalDay` is the last day booked as an island; it is missing on journeys
// saved by older builds, which progressService migrates. `haloUntil` is the
// last day of a milestone halo, `seenPlace` the place whose guide was opened.

export function getJourney() {
  return readJSON(STORAGE_KEYS.JOURNEY, { reached: 0, landed: null });
}

export function saveJourney(journey) {
  return writeJSON(STORAGE_KEYS.JOURNEY, journey);
}
