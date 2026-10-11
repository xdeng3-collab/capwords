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
const FORMAT = 'v3';

// Tiles download side by side - on a slow connection the wait is mostly the
// network's - but no more than this many at once.
const DOWNLOADS = 3;

const memory = new Map(); // key -> Uint8Array, least recently used first
const failed = new Map(); // key -> time of failure
const underway = new Set(); // keys being loaded right now
let wanted = []; // for what is on screen: loaded first
let ahead = []; // warming up for later: loaded when nothing is wanted
let onProgress = null;
let workers = 0;

const keyOf = (z, x, y) => `${z}-${x}-${y}`;

/** The tile if it is ready to draw right now, else undefined. Never waits. */
export function cachedMapTile(z, x, y) {
  return memory.get(keyOf(z, x, y));
}

/** How many tiles for what is on screen are still on their way. */
export function mapTilesPending() {
  return wanted.length + underway.size;
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

/** Drop what is already here, already coming, or failed a moment ago. */
function stillNeeded(tiles) {
  const now = Date.now();
  const seen = new Set();
  return tiles.filter(({ z, x, y }) => {
    const key = keyOf(z, x, y);
    if (seen.has(key) || memory.has(key) || underway.has(key)) return false;
    seen.add(key);
    return !(failed.has(key) && now - failed.get(key) < RETRY_AFTER_MS);
  });
}

async function worker() {
  workers += 1;
  for (let tile = wanted.shift() || ahead.shift(); tile; tile = wanted.shift() || ahead.shift()) {
    const key = keyOf(tile.z, tile.x, tile.y);
    if (!memory.has(key) && !underway.has(key)) {
      underway.add(key);
      try {
        remember(key, await load(tile));
        failed.delete(key);
      } catch (e) {
        failed.set(key, Date.now());
      }
      underway.delete(key);
      onProgress?.();
      // Let a frame through between tiles; decoding one is real work.
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
  workers -= 1;
}

function work() {
  while (workers < DOWNLOADS && workers < wanted.length + ahead.length) worker();
}

/**
 * Make these tiles ([{ z, x, y }], most wanted first) available to
 * `cachedMapTile`, calling `whenOneSettles` each time one arrives or gives up.
 * A new call replaces whatever was still waiting from the last one - the view
 * has moved on. Never throws; a tile that cannot be had is quietly skipped.
 */
export function loadMapTiles(tiles, whenOneSettles) {
  onProgress = whenOneSettles;
  wanted = stillNeeded(tiles);
  work();
}

/**
 * Fetch these tiles when there is nothing more pressing to do, so that they
 * are already on the phone by the time they are looked at. Used to get the
 * map round the newest photo ready before the globe is opened: after that,
 * opening it needs no network and no decoding. A new call replaces the last.
 */
export function warmMapTiles(tiles) {
  ahead = stillNeeded(tiles);
  work();
}

/** Forget every tile, in memory and on the phone. */
export async function clearMapTiles() {
  wanted = [];
  ahead = [];
  memory.clear();
  failed.clear();
  await deleteAllMapTiles();
}
