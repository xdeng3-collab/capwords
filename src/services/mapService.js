import { fetchMapTile, MAP_ATTRIBUTION } from '../api/mapTilesClient';
import { deleteAllMapTiles, readMapTile, writeMapTile } from '../data/mapTileStore';
import {
  TILE_MAX_ZOOM,
  TILE_SIZE,
  base64ToBytes,
  bytesToBase64,
  rasterizeTile,
} from '../utils/tileRaster';

/**
 * Close-up detail for the globe: coastlines, rivers, parks, buildings and
 * streets, as pixel-art tiles.
 *
 * A tile is a TILE_SIZE-square grid of terrain classes (utils/tileRaster.js),
 * named by the usual web-map z/x/y. Drawing has to be instant, so it only
 * ever reads what is already in memory (`cachedMapTile`); `loadMapTiles` fills
 * memory in the background, from the phone's cache first and the network
 * second. Offline, or before a tile lands, the globe just stays coarse.
 *
 * Asking for tiles tells the tile server roughly where on Earth is being
 * looked at. Nothing else leaves the phone - no photos, no coordinates.
 */

export { MAP_ATTRIBUTION, TILE_MAX_ZOOM, TILE_SIZE };

// 16 KB each; enough to pan around a city without re-reading from disk.
const MEMORY_TILES = 160;
// Do not ask again straight away for a tile that just failed.
const RETRY_AFTER_MS = 30000;
// Bump when the rasteriser changes what a cell means, to orphan old files.
const FORMAT = 'v2';

const memory = new Map(); // key -> Uint8Array, least recently used first
const failed = new Map(); // key -> time of failure
let queue = [];
let onLoaded = null;
let working = false;

const keyOf = (z, x, y) => `${z}-${x}-${y}`;

/** The tile if it is ready to draw right now, else undefined. Never waits. */
export function cachedMapTile(z, x, y) {
  return memory.get(keyOf(z, x, y));
}

function remember(key, raster) {
  memory.delete(key);
  memory.set(key, raster);
  if (memory.size > MEMORY_TILES) memory.delete(memory.keys().next().value);
}

async function load({ z, x, y }) {
  const key = keyOf(z, x, y);
  const file = `${FORMAT}-${key}`;

  const stored = await readMapTile(file);
  if (stored) {
    const raster = base64ToBytes(stored);
    if (raster.length === TILE_SIZE * TILE_SIZE) return raster;
  }

  const raster = rasterizeTile(await fetchMapTile(z, x, y), z);
  writeMapTile(file, bytesToBase64(raster));
  return raster;
}

async function work() {
  if (working) return;
  working = true;
  while (queue.length) {
    const tile = queue.shift();
    const key = keyOf(tile.z, tile.x, tile.y);
    try {
      remember(key, await load(tile));
      failed.delete(key);
      onLoaded?.();
    } catch (e) {
      failed.set(key, Date.now());
    }
    // Let a frame through between tiles; decoding one is real work.
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  working = false;
}

/**
 * Make these tiles ([{ z, x, y }], most wanted first) available to
 * `cachedMapTile`, calling `whenOneLands` each time one arrives. A new call
 * replaces whatever was still waiting from the last one - the view has moved
 * on. Never throws; a tile that cannot be had is quietly skipped.
 */
export function loadMapTiles(tiles, whenOneLands) {
  const now = Date.now();
  onLoaded = whenOneLands;
  queue = tiles.filter(({ z, x, y }) => {
    const key = keyOf(z, x, y);
    if (memory.has(key)) return false;
    return !(failed.has(key) && now - failed.get(key) < RETRY_AFTER_MS);
  });
  work();
}

/** Forget every tile, in memory and on the phone. */
export async function clearMapTiles() {
  queue = [];
  memory.clear();
  failed.clear();
  await deleteAllMapTiles();
}
