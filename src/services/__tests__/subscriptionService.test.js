import AsyncStorage from '@react-native-async-storage/async-storage';
import { PRICING, PROMO_CODES } from '../../config';
import { recordWordLearned } from '../progressService';
import {
  canLearnWord,
  consumeWord,
  getSubscription,
  redeemPromoCode,
  updateSubscription,
} from '../subscriptionService';

async function useFreeWords() {
  for (let i = 0; i < PRICING.freeWordsPerDay; i++) await recordWordLearned();
}

beforeEach(() => AsyncStorage.clear());

describe('canLearnWord', () => {
  it('allows the free words, then stops', async () => {
    expect(await canLearnWord()).toEqual({ allowed: true, reason: 'free' });
    await useFreeWords();
    expect(await canLearnWord()).toEqual({ allowed: false, reason: 'limit_reached' });
  });

  it('lets an active subscription past the free limit', async () => {
    await useFreeWords();
    await updateSubscription({ type: 'monthly', expiresAt: '2999-01-01T00:00:00.000Z' });
    expect(await canLearnWord()).toEqual({ allowed: true, reason: 'subscription' });
  });

  it('treats an expired subscription as free', async () => {
    await useFreeWords();
    await updateSubscription({ type: 'yearly', expiresAt: '2000-01-01T00:00:00.000Z' });
    expect((await canLearnWord()).allowed).toBe(false);
  });

  it('spends a per-word balance down to zero and no further', async () => {
    await useFreeWords();
    await updateSubscription({ type: 'per_word', wordBalance: 1 });
    expect(await canLearnWord()).toEqual({ allowed: true, reason: 'balance' });

    await consumeWord();
    await consumeWord();
    expect((await getSubscription()).wordBalance).toBe(0);
    expect((await canLearnWord()).allowed).toBe(false);
  });

  it('does not meter other plans', async () => {
    await updateSubscription({ type: 'unlimited' });
    await consumeWord();
    expect(await getSubscription()).toMatchObject({ type: 'unlimited', wordBalance: 0 });
    expect(await canLearnWord()).toEqual({ allowed: true, reason: 'promo' });
  });
});

describe('redeemPromoCode', () => {
  const [code] = Object.keys(PROMO_CODES);

  it('grants the plan, whatever the case and spacing of the input', async () => {
    const result = await redeemPromoCode(`  ${code.toLowerCase()} `);
    expect(result.ok).toBe(true);
    expect(await getSubscription()).toMatchObject({
      type: PROMO_CODES[code].plan,
      promoCode: code,
      expiresAt: null,
    });
  });

  it('refuses empty, unknown, and already-active codes', async () => {
    expect((await redeemPromoCode('')).ok).toBe(false);
    expect((await redeemPromoCode('NOT-A-CODE')).ok).toBe(false);
    await redeemPromoCode(code);
    expect((await redeemPromoCode(code)).ok).toBe(false);
  });
});

describe('word packs', () => {
  // Imported here so the __DEV__ switch below is read at call time.
  const { buyWordPack } = require('../purchaseService');

  afterEach(() => {
    global.__DEV__ = true;
  });

  it('are never handed out free in a release build', async () => {
    global.__DEV__ = false;
    expect(await buyWordPack(50)).toEqual({ status: 'unavailable' });
    expect((await getSubscription()).wordBalance).toBe(0);
  });

  it('stack on top of what is left in a development build', async () => {
    global.__DEV__ = true;
    await updateSubscription({ type: 'per_word', wordBalance: 12 });
    await buyWordPack(50);
    expect(await getSubscription()).toMatchObject({ type: 'per_word', wordBalance: 62 });
  });
});
