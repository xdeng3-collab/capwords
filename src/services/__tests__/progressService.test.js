import AsyncStorage from '@react-native-async-storage/async-storage';
import { COINS } from '../../config';
import { getCoins } from '../walletService';
import { updateUserProfile } from '../profileService';
import { getDailyWordCount, getStreak, recordWordLearned } from '../progressService';

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
