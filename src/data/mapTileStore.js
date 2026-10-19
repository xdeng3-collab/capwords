import * as FileSystem from 'expo-file-system';

/**
 * Earlier builds drew the Book's globe close up from map tiles, and kept them
 * in the cache directory. The globe now hands over to the system map instead,
 * so all that is left to do with them is clear them away: they show where
 * the globe was looked at.
 */
const TILE_DIR = `${FileSystem.cacheDirectory || ''}map-tiles/`;

export async function deleteAllMapTiles() {
  if (!FileSystem.cacheDirectory) return;
  await FileSystem.deleteAsync(TILE_DIR, { idempotent: true }).catch(() => {});
}
