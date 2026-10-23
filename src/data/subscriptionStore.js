import { STORAGE_KEYS, readJSON, writeJSON } from './storage';

const FREE_PLAN = {
  type: 'free', // 'free' | 'per_word' | 'monthly' | 'yearly' | 'unlimited'
  wordBalance: 0,
  expiresAt: null,
  // When the current App Store period began (ISO string), next to expiresAt.
  // Invite days wait out the paid period, so the server needs both ends.
  periodStart: null,
  promoCode: null,
  // When Pro earned by inviting pals runs out (ISO string), or null. Kept
  // apart from `type` so it can sit alongside any plan and simply lapse.
  referralProUntil: null,
};

export async function getSubscription() {
  // Spread over the defaults so a plan saved before a field existed reads it
  // as its default rather than undefined.
  return { ...FREE_PLAN, ...(await readJSON(STORAGE_KEYS.SUBSCRIPTION, FREE_PLAN)) };
}

export async function updateSubscription(updates) {
  const current = await getSubscription();
  return writeJSON(STORAGE_KEYS.SUBSCRIPTION, { ...current, ...updates });
}
