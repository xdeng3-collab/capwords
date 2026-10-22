import { STORAGE_KEYS, readString, writeString } from './storage';

// ==================== Cheers received ====================
// When this phone last showed "X cheered you on", so each cheer pops up once.

export function getCheersSeenAt() {
  return readString(STORAGE_KEYS.CHEERS_SEEN_AT);
}

export function setCheersSeenAt(iso) {
  return writeString(STORAGE_KEYS.CHEERS_SEEN_AT, iso);
}
