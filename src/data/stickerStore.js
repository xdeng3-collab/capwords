import * as FileSystem from 'expo-file-system';
import { STORAGE_KEYS, readJSON, writeJSON } from './storage';

/**
 * The sticker collection and the photos behind it.
 *
 * Photos live only on this device - nothing is uploaded. Only the
 * `stickers/<id>.jpg` sub-path is stored, never the absolute URI: iOS gives
 * the app a fresh container UUID on every reinstall, so an absolute path saved
 * today points nowhere tomorrow. resolveStickerImage() rebuilds the full URI
 * against the current documents directory at read time.
 */
export const STICKER_IMAGE_DIR = `${FileSystem.documentDirectory || ''}stickers/`;

/**
 * Copy a freshly captured photo out of the camera's temporary cache (which
 * iOS may purge at any time) into the documents folder. Returns the relative
 * path to store, or the original URI if the copy failed.
 */
export async function persistStickerImage(imageUri, id) {
  if (!imageUri || !FileSystem.documentDirectory) return imageUri;
  try {
    await FileSystem.makeDirectoryAsync(STICKER_IMAGE_DIR, { intermediates: true }).catch(() => {});
    const relative = `stickers/${id}.jpg`;
    await FileSystem.copyAsync({ from: imageUri, to: `${FileSystem.documentDirectory}${relative}` });
    return relative;
  } catch (e) {
    return imageUri; // fall back to the original URI
  }
}

/**
 * Turn a stored image reference into a URI that works right now. Handles both
 * the relative paths written today and the absolute ones written by earlier
 * versions, whose container UUID has since gone stale.
 */
export function resolveStickerImage(stored) {
  if (!stored) return stored;
  const documents = FileSystem.documentDirectory || '';
  const match = stored.match(/stickers\/[^/]+$/);
  if (match) return `${documents}${match[0]}`;
  return stored; // an unrecognised URI (e.g. a picked photo we could not copy)
}

/** Stickers exactly as stored, newest first. Use this before writing the list back. */
export function readStickers() {
  return readJSON(STORAGE_KEYS.STICKERS, []);
}

export function writeStickers(stickers) {
  return writeJSON(STORAGE_KEYS.STICKERS, stickers);
}

/** Delete one sticker's photo, if it is one of ours. Best effort. */
export function deleteStickerImage(stored) {
  const resolved = resolveStickerImage(stored);
  if (resolved?.startsWith(STICKER_IMAGE_DIR)) {
    FileSystem.deleteAsync(resolved, { idempotent: true }).catch(() => {});
  }
}

export async function deleteAllStickerImages() {
  if (!FileSystem.documentDirectory) return;
  await FileSystem.deleteAsync(STICKER_IMAGE_DIR, { idempotent: true }).catch(() => {});
}
