import * as FileSystem from 'expo-file-system';

/**
 * Map tiles already drawn for the globe, kept so the places someone has
 * photos - which is where the globe opens every time - show their streets at
 * once, and offline.
 *
 * They live in the cache directory: iOS may clear it when the phone is short
 * of space, and nothing is lost if it does. Each file is one rasterised tile
 * as base64 (see utils/tileRaster.js), about 20 KB.
 */
const TILE_DIR = `${FileSystem.cacheDirectory || ''}map-tiles/`;
// Past this many files the whole cache is dropped and rebuilt as needed.
const MAX_TILES = 600;

let ready = null;

function prepare() {
  if (!ready) {
    ready = (async () => {
      await FileSystem.makeDirectoryAsync(TILE_DIR, { intermediates: true }).catch(() => {});
      const names = await FileSystem.readDirectoryAsync(TILE_DIR).catch(() => []);
      if (names.length > MAX_TILES) {
        await FileSystem.deleteAsync(TILE_DIR, { idempotent: true }).catch(() => {});
        await FileSystem.makeDirectoryAsync(TILE_DIR, { intermediates: true }).catch(() => {});
      }
    })();
  }
  return ready;
}

/** A stored tile as base64, or null if it is not there. `key` is file-safe. */
export async function readMapTile(key) {
  if (!FileSystem.cacheDirectory) return null;
  await prepare();
  try {
    return await FileSystem.readAsStringAsync(`${TILE_DIR}${key}`);
  } catch (e) {
    return null;
  }
}

/** Best effort: a tile that fails to save is simply fetched again next time. */
export async function writeMapTile(key, base64) {
  if (!FileSystem.cacheDirectory) return;
  await prepare();
  await FileSystem.writeAsStringAsync(`${TILE_DIR}${key}`, base64).catch(() => {});
}

export async function deleteAllMapTiles() {
  if (!FileSystem.cacheDirectory) return;
  ready = null;
  await FileSystem.deleteAsync(TILE_DIR, { idempotent: true }).catch(() => {});
}
