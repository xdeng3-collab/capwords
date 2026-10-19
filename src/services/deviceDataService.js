import { STORAGE_KEYS, removeKeys, removeKeysIfPresent } from '../data/storage';
import { deleteAllStickerImages, readStickers, writeStickers } from '../data/stickerStore';
import { deleteAllMapTiles } from '../data/mapTileStore';

/**
 * Housekeeping for everything this phone stores.
 */

// Sample stickers that an earlier build could seed from the profile screen.
const DEMO_STICKER_PREFIX = 'demo_';

/**
 * Clear data that older versions left on the phone. Idempotent and cheap - it
 * only writes when it actually finds something - so it runs on every launch.
 *
 * Three things get swept: seeded demo stickers; the local friends list and
 * cheers from before pals moved to Supabase, which were never real accounts
 * and nothing reads any more; and the map tiles the globe used to draw from.
 */
export async function removeDemoData() {
  const stickers = await readStickers();
  const kept = stickers.filter((s) => !String(s.id).startsWith(DEMO_STICKER_PREFIX));
  if (kept.length !== stickers.length) await writeStickers(kept);

  await removeKeysIfPresent([STORAGE_KEYS.FRIENDS, STORAGE_KEYS.CHEERS]);
  await deleteAllMapTiles();
}

/**
 * Erase everything this phone knows about the person: profile, collection and
 * its photos, pet, streak, coins. The online account (if any) is untouched -
 * accountService.signOutAccount() / deleteAccount() handle that.
 *
 * A paid plan is not lost with it: the entitlement belongs to the Apple ID, so
 * the App Store sync on next launch (or Restore Purchases) brings it back.
 */
export async function eraseDeviceData() {
  await removeKeys(Object.values(STORAGE_KEYS));
  await deleteAllStickerImages();
  await deleteAllMapTiles();
}
