import { PRICING, PROMO_CODES } from '../config';
import { getWordCountOn } from '../data/progressStore';
import { getSubscription, updateSubscription } from '../data/subscriptionStore';
import { todayKey } from '../utils/date';

/**
 * What this person may learn today: the free allowance, a per-word balance,
 * a store subscription (kept in sync by purchaseService), or a promo grant.
 */

export { getSubscription, updateSubscription };

/**
 * Whether another word may be learned right now.
 * Returns { allowed, reason } with reason one of
 * 'promo' | 'subscription' | 'balance' | 'free' | 'limit_reached'.
 */
export async function canLearnWord() {
  const sub = await getSubscription();

  if (sub.type === 'unlimited') {
    return { allowed: true, reason: 'promo' };
  }

  if (sub.type === 'monthly' || sub.type === 'yearly') {
    if (new Date(sub.expiresAt) > new Date()) {
      return { allowed: true, reason: 'subscription' };
    }
  }

  if (sub.type === 'per_word' && sub.wordBalance > 0) {
    return { allowed: true, reason: 'balance' };
  }

  const wordsToday = await getWordCountOn(todayKey());
  if (wordsToday < PRICING.freeWordsPerDay) {
    return { allowed: true, reason: 'free' };
  }

  return { allowed: false, reason: 'limit_reached' };
}

/** Charge one word against a per-word balance. Other plans are not metered. */
export async function consumeWord() {
  const sub = await getSubscription();
  if (sub.type === 'per_word') {
    await updateSubscription({ wordBalance: Math.max(0, sub.wordBalance - 1) });
  }
}

/**
 * Redeem a promo code. Returns { ok, message, subscription } so the caller can
 * show the outcome without needing to know which codes exist.
 */
export async function redeemPromoCode(rawCode) {
  const code = (rawCode || '').trim().toUpperCase();
  if (!code) {
    return { ok: false, message: 'Enter a promo code first.' };
  }

  const promo = PROMO_CODES[code];
  if (!promo) {
    return { ok: false, message: "That code isn't valid. Check the spelling and try again." };
  }

  const current = await getSubscription();
  if (current.promoCode === code) {
    return { ok: false, message: 'This code is already active on your account.' };
  }

  const subscription = await updateSubscription({
    type: promo.plan,
    // Unlimited plans never expire, so clear any leftover subscription date.
    expiresAt: null,
    promoCode: code,
  });

  return { ok: true, message: promo.message, subscription };
}
