import {
  deleteStickerImage,
  persistStickerImage,
  readStickers,
  resolveStickerImage,
  writeStickers,
} from '../data/stickerStore';
import { localDayKey } from '../utils/date';
import { recordWordLearned } from './progressService';

/**
 * The sticker collection: one sticker per word learned.
 *
 * Stickers are handed to screens with `imageUri` already resolved for this
 * install; what is stored stays relative (see data/stickerStore.js).
 */

/**
 * Save a newly recognised word. Also counts it for today, which pays coins
 * and may extend the streak. Returns the sticker plus `coinsEarned`.
 */
export async function saveSticker(sticker) {
  const stickers = await readStickers();
  const id = Date.now().toString();
  const imageUri = await persistStickerImage(sticker.imageUri, id);
  const saved = {
    ...sticker,
    imageUri,
    id,
    createdAt: new Date().toISOString(),
  };
  stickers.unshift(saved);
  await writeStickers(stickers);

  const coinsEarned = await recordWordLearned();
  return { ...saved, imageUri: resolveStickerImage(imageUri), coinsEarned };
}

/** Every sticker, newest first, with image URIs valid for this install. */
export async function getStickers() {
  const stickers = await readStickers();
  return stickers.map((s) => ({ ...s, imageUri: resolveStickerImage(s.imageUri) }));
}

/**
 * Stickers grouped by the local calendar day they were learned:
 * [{ date, items }], newest day first. Local, not UTC, because this is what
 * the Book labels "Today" / "Yesterday" - a word snapped at 7am in Beijing is
 * still yesterday in UTC.
 */
export async function getStickersByDate() {
  const stickers = await getStickers();
  const grouped = {};
  stickers.forEach((sticker) => {
    const date = localDayKey(sticker.createdAt);
    (grouped[date] = grouped[date] || []).push(sticker);
  });
  return Object.entries(grouped)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, items]) => ({ date, items }));
}

/**
 * Remove a sticker and its photo. Tidying a collection should not cost
 * anything earned, so the day's count, coins and streak are left alone.
 */
export async function deleteSticker(id) {
  const stickers = await readStickers();
  const sticker = stickers.find((s) => s.id === id);
  await writeStickers(stickers.filter((s) => s.id !== id));
  deleteStickerImage(sticker?.imageUri);
}
