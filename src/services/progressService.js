import { COINS, DESTINATIONS, JOURNEY } from '../config';
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
import { daysBetween, shiftDayKey, todayKey, yesterdayKey } from '../utils/date';

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
  // Book today's island now: the home screen may not be opened again today.
  if (wordsToday >= profile.dailyGoal) await saveJourney((await bookToday()).journey);
  return earned;
}

// ==================== Sea journey ====================
// Every day the goal is met earns one island on the home screen's sea map.
// Unlike the streak it never goes back: a missed day just means no new island.
//
// A day is booked on the day itself (`lastGoalDay`), never worked out again
// from the word counts afterwards - otherwise lowering the goal would turn
// every old short day into an island at once.

/** How many days in `counts` (day key -> words) met `dailyGoal`. Pure. */
export function countGoalDays(counts, dailyGoal) {
  return Object.values(counts || {}).filter((n) => n >= dailyGoal).length;
}

/** Milestone islands carry the halo and the bonus. Island 0 is the dock. */
export function isMilestoneIsland(index) {
  return index > 0 && index % JOURNEY.milestoneEvery === 0;
}

/** The milestone islands after `from`, up to and including `to`. Pure. */
export function milestonesBetween(from, to) {
  const out = [];
  const every = JOURNEY.milestoneEvery;
  for (let i = (Math.floor(from / every) + 1) * every; i <= to; i += every) out.push(i);
  return out;
}

/** Days of halo left, counting today; 0 when there is none. Pure. */
export function haloDaysLeft(journey, today = todayKey()) {
  const until = journey?.haloUntil;
  if (!until || until < today) return 0;
  return Math.round(daysBetween(`${today}T00:00:00Z`, `${until}T00:00:00Z`)) + 1;
}

/** Where the buddy stands: the island before the one a pending jump goes to. */
export function currentIsland(journey) {
  return journey.reached > journey.landed ? journey.reached - 1 : journey.reached;
}

/** The place on the journey that island `island` belongs to. */
export function placeAt(island) {
  let place = DESTINATIONS[0];
  for (const d of DESTINATIONS) if (island >= d.from) place = d;
  return place;
}

/** Where the buddy is now: { journey, island, place }. */
export async function getCurrentPlace() {
  const journey = await getJourneyState();
  const island = currentIsland(journey);
  return { journey, island, place: placeAt(island) };
}

/** The saved journey, with today booked if today's goal is met. */
async function bookToday() {
  const [counts, profile, saved] = await Promise.all([
    getAllWordCounts(),
    getUserProfile(),
    getJourney(),
  ]);
  const today = todayKey();
  const metToday = (counts[today] || 0) >= profile.dailyGoal;
  const journey = { ...saved };

  if (!('lastGoalDay' in saved)) {
    // Saved before days were booked one by one (or never saved): count the
    // past once, with today's goal, and book day by day from here on.
    journey.reached = Math.max(countGoalDays(counts, profile.dailyGoal), saved.reached || 0);
    journey.lastGoalDay = metToday ? today : null;
  } else if (metToday && saved.lastGoalDay !== today) {
    journey.reached = (saved.reached || 0) + 1;
    journey.lastGoalDay = today;
  }
  return { journey, metToday };
}

/**
 * The buddy's place on the sea map: { reached, landed, haloUntil, ... }.
 * `landed < reached` means a jump is owed - call landOnIsland(reached) once
 * it has played.
 */
export async function getJourneyState() {
  const { journey, metToday } = await bookToday();
  if (journey.landed == null) {
    // First look at the map: put the buddy where it already is, leaving
    // today's island (if earned) for the welcome jump.
    journey.landed = Math.max(journey.reached - (metToday ? 1 : 0), 0);
  }
  journey.landed = Math.min(journey.landed, journey.reached);
  return saveJourney(journey);
}

/**
 * The jump to `index` has played. Landing on (or past) a milestone island
 * pays COINS.milestoneBonus for each and puts on the halo for
 * JOURNEY.haloDays days. Returns the journey plus `milestone` (the island, or
 * null) and `coinsEarned`.
 */
export async function landOnIsland(index) {
  const saved = await getJourney();
  const crossed = milestonesBetween(saved.landed ?? index, index);
  const journey = { ...saved, landed: index };
  let coinsEarned = 0;
  if (crossed.length) {
    journey.haloUntil = shiftDayKey(todayKey(), JOURNEY.haloDays - 1);
    coinsEarned = crossed.length * COINS.milestoneBonus;
    await addCoins(coinsEarned);
  }
  await saveJourney(journey);
  return { ...journey, milestone: crossed.length ? crossed[crossed.length - 1] : null, coinsEarned };
}

/** Remember the place whose travel guide has been opened. */
export async function markPlaceSeen(key) {
  const saved = await getJourney();
  if (saved.seenPlace === key) return saved;
  return saveJourney({ ...saved, seenPlace: key });
}
