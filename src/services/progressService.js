import { COINS } from '../config';
import { getUserProfile } from '../data/profileStore';
import {
  getStreak,
  getWordCountOn,
  incrementWordCountOn,
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
