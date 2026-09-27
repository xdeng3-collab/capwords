import { STORAGE_KEYS, readJSON, writeJSON } from './storage';

const FREE_PLAN = {
  type: 'free', // 'free' | 'per_word' | 'monthly' | 'yearly' | 'unlimited'
  wordBalance: 0,
  expiresAt: null,
  promoCode: null,
};

export function getSubscription() {
  return readJSON(STORAGE_KEYS.SUBSCRIPTION, { ...FREE_PLAN });
}

export async function updateSubscription(updates) {
  const current = await getSubscription();
  return writeJSON(STORAGE_KEYS.SUBSCRIPTION, { ...current, ...updates });
}
