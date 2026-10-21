import { COINS } from '../config';
import { getUserProfile } from '../data/profileStore';
import {
  getAllWordCounts,
  getJourney,
  getStreak,
  getWordCountOn,
  incrementWordCountOn,
  saveJourney,
  saveStreak,
} from '../data/progressStore';
import { addCoins } from '../data/walletStore';
import { todayKey, yesterdayKey } from '../utils/date';

/**
 * Daily word counts and the streak.
 *
 * The streak moves on the day the daily goal is met: consecutive goal days
 * extend it, a gap restarts it at 1.
 */

export { getStreak };

/** Words learned on `day` (a day key), today by default. */
export function getDailyWordCount(day) {
  return getWordCountOn(day || todayKey());
}

/** Count today towards the streak if today's goal is met. Safe to call often. */
export async function updateStreak() {
  const [streak, profile, wordsToday] = await Promise.all([
    getStreak(),
    getUserProfile(),
    getDailyWordCount(),
  ]);
  const today = todayKey();

  if (wordsToday < profile.dailyGoal) return streak;
  if (streak.lastActiveDate === today) return streak; // already counted today

  const continued = streak.lastActiveDate === yesterdayKey() || streak.current === 0;
  streak.current = continued ? streak.current + 1 : 1;
  streak.longest = Math.max(streak.longest, streak.current);
  streak.lastActiveDate = today;
  return saveStreak(streak);
}

/**
 * Book-keeping for one newly learned word: count it, pay the learning coins
 * (plus the bonus on the word that reaches the goal), and move the streak.
 * Returns the coins earned.
 */
export async function recordWordLearned() {
  const wordsToday = await incrementWordCountOn(todayKey());

  const profile = await getUserProfile();
  let earned = COINS.perWord;
  if (wordsToday === profile.dailyGoal) earned += COINS.goalBonus;
  await addCoins(earned);

  await updateStreak();
  return earned;
}

// ==================== Sea journey ====================
// Every day the goal is met earns one island on the home screen's sea map.
// Unlike the streak it never goes back: a missed day just means no new island.

/** How many days in `counts` (day key -> words) met `dailyGoal`. Pure. */
export function countGoalDays(counts, dailyGoal) {
  return Object.values(counts || {}).filter((n) => n >= dailyGoal).length;
}

/**
 * The buddy's place on the sea map: { reached, landed }. `landed < reached`
 * means a jump is owed - call landOnIsland(reached) once it has played.
 */
export async function getJourneyState() {
  const [counts, profile, saved] = await Promise.all([
    getAllWordCounts(),
    getUserProfile(),
    getJourney(),
  ]);
  // Raising the goal must not sink islands already earned.
  const reached = Math.max(countGoalDays(counts, profile.dailyGoal), saved.reached || 0);
  let landed = saved.landed;
  if (landed == null) {
    // First look at the map: put the buddy where it already is, leaving
    // today's island (if earned) for the welcome jump.
    const metToday = (counts[todayKey()] || 0) >= profile.dailyGoal;
    landed = Math.max(reached - (metToday ? 1 : 0), 0);
  }
  landed = Math.min(landed, reached);
  return saveJourney({ reached, landed });
}

export async function landOnIsland(index) {
  const saved = await getJourney();
  return saveJourney({ ...saved, landed: index });
}
