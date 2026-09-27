import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * The one place that knows how things are laid out in AsyncStorage.
 *
 * Every key the app has ever written is listed here, including retired ones,
 * because eraseDeviceData() clears by this list and the legacy sweep needs the
 * old names. Renaming a key strands whatever is stored under the old name, so
 * add a new key and migrate instead.
 */
export const STORAGE_KEYS = {
  STICKERS: 'capwords_stickers',
  USER_PROFILE: 'capwords_profile',
  STREAK: 'capwords_streak',
  SETTINGS: 'capwords_settings',
  SUBSCRIPTION: 'capwords_subscription',
  DAILY_WORDS: 'capwords_daily_words',
  PET: 'capwords_pet',
  COINS: 'capwords_coins',
  LAST_CHECK_IN: 'capwords_last_check_in',
  PRACTICED_STICKERS: 'capwords_practiced_stickers',
  // Retired: pals and cheers moved to Supabase. Kept so the legacy sweep and
  // eraseDeviceData() still clear what older builds left behind.
  FRIENDS: 'capwords_friends',
  CHEERS: 'capwords_cheers',
};

/** Parsed JSON under `key`, or `fallback` when nothing is stored. */
export async function readJSON(key, fallback = null) {
  const raw = await AsyncStorage.getItem(key);
  return raw ? JSON.parse(raw) : fallback;
}

export async function writeJSON(key, value) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
  return value;
}

/** Shallow-merge `updates` into the object under `key` (created from `defaults`). */
export async function mergeJSON(key, updates, defaults = {}) {
  const current = await readJSON(key, defaults);
  return writeJSON(key, { ...current, ...updates });
}

export function readString(key) {
  return AsyncStorage.getItem(key);
}

export function writeString(key, value) {
  return AsyncStorage.setItem(key, value);
}

export function removeKeys(keys) {
  return AsyncStorage.multiRemove(keys);
}

/** Remove only the keys that actually hold something. Returns what was removed. */
export async function removeKeysIfPresent(keys) {
  const entries = await AsyncStorage.multiGet(keys);
  const present = entries.filter(([, value]) => value != null).map(([key]) => key);
  if (present.length) await AsyncStorage.multiRemove(present);
  return present;
}
