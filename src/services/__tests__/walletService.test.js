import AsyncStorage from '@react-native-async-storage/async-storage';
import { COINS } from '../../config';
import {
  awardPracticeBonus,
  claimDailyGift,
  getCoins,
  isDailyGiftAvailable,
} from '../walletService';

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
  jest.setSystemTime(new Date(Date.UTC(2026, 8, 10, 12)));
});

afterEach(() => jest.useRealTimers());

it('gives the daily gift once per day', async () => {
  expect(await claimDailyGift()).toMatchObject({ claimed: true, earned: COINS.checkInBonus });
  expect(await isDailyGiftAvailable()).toBe(false);
  expect(await claimDailyGift()).toMatchObject({ claimed: false, earned: 0 });

  jest.setSystemTime(new Date(Date.UTC(2026, 8, 11, 12)));
  expect(await isDailyGiftAvailable()).toBe(true);
  expect((await claimDailyGift()).claimed).toBe(true);
  expect((await getCoins()).balance).toBe(2 * COINS.checkInBonus);
});

it('pays the practice bonus once per sticker', async () => {
  expect(await awardPracticeBonus('a')).toBe(COINS.practiceBonus);
  expect(await awardPracticeBonus('a')).toBe(0);
  expect(await awardPracticeBonus('b')).toBe(COINS.practiceBonus);
  expect(await awardPracticeBonus(null)).toBe(0);
});
