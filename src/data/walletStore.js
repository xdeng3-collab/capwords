import { STORAGE_KEYS, readJSON, readString, writeJSON, writeString } from './storage';

// ==================== Coins ====================

export function getCoins() {
  return readJSON(STORAGE_KEYS.COINS, { balance: 0, lifetime: 0 });
}

export async function addCoins(amount) {
  const coins = await getCoins();
  coins.balance += amount;
  coins.lifetime += Math.max(amount, 0);
  return writeJSON(STORAGE_KEYS.COINS, coins);
}

/** Returns the updated coins object, or null if the balance is insufficient. */
export async function spendCoins(amount) {
  const coins = await getCoins();
  if (coins.balance < amount) return null;
  coins.balance -= amount;
  return writeJSON(STORAGE_KEYS.COINS, coins);
}

// ==================== Once-only rewards ====================

/** Day key of the last daily-gift claim, or null. */
export function getLastCheckIn() {
  return readString(STORAGE_KEYS.LAST_CHECK_IN);
}

export function setLastCheckIn(day) {
  return writeString(STORAGE_KEYS.LAST_CHECK_IN, day);
}

/** Ids of stickers that already paid out the pronunciation-practice bonus. */
export function getPracticedStickerIds() {
  return readJSON(STORAGE_KEYS.PRACTICED_STICKERS, []);
}

export function savePracticedStickerIds(ids) {
  return writeJSON(STORAGE_KEYS.PRACTICED_STICKERS, ids);
}
