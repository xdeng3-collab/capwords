import { STORAGE_KEYS, readJSON, writeJSON } from './storage';

/**
 * Review progress: { cards: { [stickerId]: { box, due } }, rewardDay }.
 * A sticker with no card has never been reviewed. `rewardDay` is the last
 * day key the review bonus was paid.
 */
export function getReviewState() {
  return readJSON(STORAGE_KEYS.REVIEW, { cards: {}, rewardDay: null });
}

export function saveReviewState(state) {
  return writeJSON(STORAGE_KEYS.REVIEW, state);
}
