import AsyncStorage from '@react-native-async-storage/async-storage';
import { COINS, JOURNEY } from '../../config';
import { getCoins } from '../walletService';
import { updateUserProfile } from '../profileService';
import {
  countGoalDays,
  getDailyWordCount,
  getJourneyState,
  getStreak,
  haloDaysLeft,
  isMilestoneIsland,
  landOnIsland,
  milestonesBetween,
  recordWordLearned,
} from '../progressService';

// Noon UTC keeps these tests about the streak rules, not about day boundaries.
const day = (n) => new Date(Date.UTC(2026, 8, 10 + n, 12));

async function learn(count) {
  for (let i = 0; i < count; i++) await recordWordLearned();
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
  jest.setSystemTime(day(0));
  await updateUserProfile({ dailyGoal: 3 });
});

afterEach(() => jest.useRealTimers());

describe('streak', () => {
  it('starts at 1 on the first day the goal is met, not before', async () => {
    await learn(2);
    expect((await getStreak()).current).toBe(0);
    await learn(1);
    expect(await getStreak()).toMatchObject({ current: 1, longest: 1 });
  });

  it('counts a day once, however many words past the goal', async () => {
    await learn(6);
    expect((await getStreak()).current).toBe(1);
  });

  it('extends on consecutive goal days and restarts after a gap', async () => {
    await learn(3);
    jest.setSystemTime(day(1));
    await learn(3);
    expect((await getStreak()).current).toBe(2);

    jest.setSystemTime(day(3)); // day 2 missed
    await learn(3);
    expect(await getStreak()).toMatchObject({ current: 1, longest: 2 });
  });
});

describe('recordWordLearned', () => {
  it('counts the word for today', async () => {
    await learn(2);
    expect(await getDailyWordCount()).toBe(2);
  });

  it('pays the goal bonus only on the word that reaches the goal', async () => {
    const earned = [];
    for (let i = 0; i < 4; i++) earned.push(await recordWordLearned());
    expect(earned).toEqual([
      COINS.perWord,
      COINS.perWord,
      COINS.perWord + COINS.goalBonus,
      COINS.perWord,
    ]);
    expect((await getCoins()).balance).toBe(4 * COINS.perWord + COINS.goalBonus);
  });

  it('starts a new count on a new day', async () => {
    await learn(2);
    jest.setSystemTime(day(1));
    expect(await getDailyWordCount()).toBe(0);
  });
});

describe('sea journey', () => {
  it('counts only days that met the goal', () => {
    expect(countGoalDays({ a: 3, b: 2, c: 7 }, 3)).toBe(2);
    expect(countGoalDays({}, 3)).toBe(0);
  });

  it('earns an island on the goal day and owes one jump', async () => {
    await learn(2);
    expect(await getJourneyState()).toMatchObject({ reached: 0, landed: 0 });
    await learn(1);
    expect(await getJourneyState()).toMatchObject({ reached: 1, landed: 0 });
    await landOnIsland(1);
    expect(await getJourneyState()).toMatchObject({ reached: 1, landed: 1 });
  });

  it('keeps islands when the goal is raised later', async () => {
    await learn(3);
    await getJourneyState();
    await updateUserProfile({ dailyGoal: 10 });
    expect((await getJourneyState()).reached).toBe(1);
  });

  it('does not turn past short days into islands when the goal is lowered', async () => {
    await learn(2);
    await getJourneyState();
    jest.setSystemTime(day(1));
    await learn(2);
    jest.setSystemTime(day(2));
    await updateUserProfile({ dailyGoal: 2 });
    expect((await getJourneyState()).reached).toBe(0);
    await learn(2);
    expect((await getJourneyState()).reached).toBe(1);
  });

  it("books today's island once if the goal is lowered below today's words", async () => {
    await learn(2);
    await getJourneyState();
    await updateUserProfile({ dailyGoal: 2 });
    expect((await getJourneyState()).reached).toBe(1);
    await learn(3);
    expect((await getJourneyState()).reached).toBe(1);
  });

  it('books goal days even when the map is not opened', async () => {
    await learn(3);
    jest.setSystemTime(day(1));
    await learn(3);
    jest.setSystemTime(day(2));
    expect((await getJourneyState()).reached).toBe(2);
  });

  it("leaves only today's island to jump to on a first look", async () => {
    await learn(3);
    jest.setSystemTime(day(1));
    await learn(3);
    expect(await getJourneyState()).toMatchObject({ reached: 2, landed: 1 });
  });

  it('migrates a journey saved before days were booked one by one', async () => {
    await AsyncStorage.setItem(
      'capwords_daily_words',
      JSON.stringify({ '2026-09-01': 3, '2026-09-02': 3, '2026-09-03': 1 })
    );
    await AsyncStorage.setItem('capwords_journey', JSON.stringify({ reached: 1, landed: 1 }));
    expect(await getJourneyState()).toMatchObject({ reached: 2, landed: 1, lastGoalDay: null });
    await updateUserProfile({ dailyGoal: 1 });
    expect((await getJourneyState()).reached).toBe(2);
  });
});

describe('milestones', () => {
  const every = JOURNEY.milestoneEvery;

  it('marks every milestone island but not the dock', () => {
    expect(isMilestoneIsland(0)).toBe(false);
    expect(isMilestoneIsland(every)).toBe(true);
    expect(isMilestoneIsland(every + 1)).toBe(false);
    expect(milestonesBetween(every - 1, every)).toEqual([every]);
    expect(milestonesBetween(every, every + 1)).toEqual([]);
    expect(milestonesBetween(0, 2 * every)).toEqual([every, 2 * every]);
  });

  it('pays the bonus and puts on the halo once, on landing', async () => {
    await AsyncStorage.setItem(
      'capwords_journey',
      JSON.stringify({ reached: every, landed: every - 1, lastGoalDay: null })
    );
    const before = (await getCoins()).balance;

    const landed = await landOnIsland(every);
    expect(landed).toMatchObject({ milestone: every, coinsEarned: COINS.milestoneBonus });
    expect((await getCoins()).balance).toBe(before + COINS.milestoneBonus);
    expect(haloDaysLeft(landed)).toBe(JOURNEY.haloDays);

    // Landing there again pays nothing more.
    expect(await landOnIsland(every)).toMatchObject({ milestone: null, coinsEarned: 0 });
    expect((await getCoins()).balance).toBe(before + COINS.milestoneBonus);
  });

  it('lasts haloDays days, counting the landing day', async () => {
    await AsyncStorage.setItem(
      'capwords_journey',
      JSON.stringify({ reached: every, landed: every - 1, lastGoalDay: null })
    );
    const landed = await landOnIsland(every);
    jest.setSystemTime(day(JOURNEY.haloDays - 1));
    expect(haloDaysLeft(landed)).toBe(1);
    jest.setSystemTime(day(JOURNEY.haloDays));
    expect(haloDaysLeft(landed)).toBe(0);
    expect(haloDaysLeft({})).toBe(0);
  });
});
