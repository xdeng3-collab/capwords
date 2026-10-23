import { PRICING, PROMO_CODES } from '../config';
import { getUserProfile, updateUserProfile } from '../data/profileStore';
import { getWordCountOn } from '../data/progressStore';
import { getSubscription, updateSubscription } from '../data/subscriptionStore';
import { todayKey } from '../utils/date';

/**
 * What this person may learn today: the free allowance, a per-word balance,
 * a store subscription (kept in sync by purchaseService), a promo grant, or
 * Pro earned by inviting pals (kept in sync by referralService).
 */

export { getSubscription, updateSubscription };

/** Whether invite Pro is running at `now`. */
export function hasReferralPro(sub, now = new Date()) {
  return Boolean(sub?.referralProUntil) && new Date(sub.referralProUntil) > now;
}

/** Whether an App Store subscription is paid up at `now`. */
export function hasPaidPlan(sub, now = new Date()) {
  return (
    (sub?.type === 'monthly' || sub?.type === 'yearly') &&
    Boolean(sub.expiresAt) &&
    new Date(sub.expiresAt) > now
  );
}

/**
 * Invite days still to come, rounded up. For a paying member they start when
 * the paid period ends (the server lays them out after it), so the paid days
 * in between are not counted as invite days.
 */
export function referralDaysLeft(sub, now = new Date()) {
  if (!sub?.referralProUntil) return 0;
  const start = hasPaidPlan(sub, now) ? new Date(sub.expiresAt) : now;
  return Math.max(0, Math.ceil((new Date(sub.referralProUntil) - start) / 86400000));
}

/** Store when invite Pro ends, as the server reported it (null for never had any). */
export function setReferralProUntil(until) {
  return updateSubscription({ referralProUntil: until ? new Date(until).toISOString() : null });
}

/**
 * Whether another word may be learned right now.
 * Returns { allowed, reason } with reason one of
 * 'promo' | 'subscription' | 'referral' | 'balance' | 'free' | 'limit_reached'.
 */
export async function canLearnWord() {
  const sub = await getSubscription();

  if (sub.type === 'unlimited') {
    return { allowed: true, reason: 'promo' };
  }

  if (hasPaidPlan(sub)) {
    return { allowed: true, reason: 'subscription' };
  }

  // Ahead of the balance, so invite days do not spend words someone paid for.
  if (hasReferralPro(sub)) {
    return { allowed: true, reason: 'referral' };
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

/**
 * The highest daily goal this plan can actually reach, or null for no cap.
 * A free learner stops at the free words, so a goal above that could never
 * be met: no streak, no islands. Anyone who can keep learning past it - a
 * subscription, a promo, invite Pro, or words left in a pack - has no cap.
 */
export async function getGoalCap() {
  const sub = await getSubscription();
  if (sub.type === 'unlimited') return null;
  if (hasPaidPlan(sub)) return null;
  if (hasReferralPro(sub)) return null;
  if (sub.type === 'per_word' && sub.wordBalance > 0) return null;
  return PRICING.freeWordsPerDay;
}

/**
 * Bring the daily goal within reach of the plan: lowers it to the cap when a
 * free learner's goal is above it (an old default of 5, or a lapsed plan).
 * Never raises it, and does not count against the weekly change limit.
 * Returns the profile.
 */
export async function fitGoalToPlan() {
  const [profile, cap] = await Promise.all([getUserProfile(), getGoalCap()]);
  if (cap == null || profile.dailyGoal <= cap) return profile;
  return updateUserProfile({ dailyGoal: cap });
}
