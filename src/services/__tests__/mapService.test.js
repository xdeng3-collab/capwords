import { buildVectorTile } from '../../../test/vectorTile';
import { fetchMapTile } from '../../api/mapTilesClient';
import { TERRAIN } from '../../utils/tileRaster';
import {
  TILE_SIZE,
  cachedMapTile,
  clearMapTiles,
  loadMapTiles,
  mapTilesPending,
  warmMapTiles,
} from '../mapService';

jest.mock('../../api/mapTilesClient', () => ({
  MAP_ATTRIBUTION: 'test',
  fetchMapTile: jest.fn(),
}));

// A phone's cache directory, in memory.
const mockFiles = new Map();
jest.mock('expo-file-system', () => ({
  cacheDirectory: 'file:///app/Caches/',
  makeDirectoryAsync: jest.fn(async () => {}),
  readDirectoryAsync: jest.fn(async () => [...mockFiles.keys()]),
  readAsStringAsync: jest.fn(async (path) => {
    if (!mockFiles.has(path)) throw new Error('no such file');
    return mockFiles.get(path);
  }),
  writeAsStringAsync: jest.fn(async (path, text) => {
    mockFiles.set(path, text);
  }),
  deleteAsync: jest.fn(async () => mockFiles.clear()),
}));

const lake = buildVectorTile({
  water: [{ type: 'polygon', class: 'lake', rings: [[[0, 0], [4096, 0], [4096, 4096], [0, 4096], [0, 0]]] }],
});
const tile = { z: 12, x: 1138, y: 1544 };

/** Ask for tiles and wait until the service has nothing left to do. */
async function load(tiles) {
  const landed = jest.fn();
  loadMapTiles(tiles, landed);
  for (let i = 0; i < 20; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
  return landed;
}

beforeEach(async () => {
  await clearMapTiles();
  fetchMapTile.mockReset();
  fetchMapTile.mockResolvedValue(lake);
});

it('has nothing to draw until a tile has been loaded', async () => {
  expect(cachedMapTile(12, 1138, 1544)).toBeUndefined();
  const landed = await load([tile]);
  expect(landed).toHaveBeenCalledTimes(1);
  const raster = cachedMapTile(12, 1138, 1544);
  expect(raster).toHaveLength(TILE_SIZE * TILE_SIZE);
  expect(raster[0]).toBe(TERRAIN.WATER);
});

it('fetches a tile once, however often it is asked for', async () => {
  await load([tile]);
  const landed = await load([tile, tile]);
  expect(fetchMapTile).toHaveBeenCalledTimes(1);
  expect(landed).not.toHaveBeenCalled();
});

it('draws from the phone, not the network, after a restart', async () => {
  await load([tile]);
  const [[path, saved]] = [...mockFiles.entries()];
  await clearMapTiles(); // forgets memory and disk...
  mockFiles.set(path, saved); // ...so put the file back, as a relaunch would find it
  fetchMapTile.mockRejectedValue(new Error('offline'));

  await load([tile]);
  expect(cachedMapTile(12, 1138, 1544)[0]).toBe(TERRAIN.WATER);
  expect(fetchMapTile).toHaveBeenCalledTimes(1);
});

it('stays quiet offline and does not hammer a tile that just failed', async () => {
  fetchMapTile.mockRejectedValue(new Error('offline'));
  const settled = await load([tile]);
  // Told once that it gave up, so a "loading" sign can come down.
  expect(settled).toHaveBeenCalledTimes(1);
  expect(mapTilesPending()).toBe(0);
  expect(cachedMapTile(12, 1138, 1544)).toBeUndefined();

  await load([tile]);
  expect(fetchMapTile).toHaveBeenCalledTimes(1);
});

it('carries on past a tile that cannot be had', async () => {
  fetchMapTile.mockImplementation(async (z, x) => {
    if (x === 1) throw new Error('missing');
    return lake;
  });
  const settled = await load([{ z: 5, x: 1, y: 1 }, { z: 5, x: 2, y: 1 }]);
  expect(settled).toHaveBeenCalledTimes(2);
  expect(cachedMapTile(5, 1, 1)).toBeUndefined();
  expect(cachedMapTile(5, 2, 1)).toBeDefined();
});

it('downloads a few tiles at once, but only a few', async () => {
  let inFlight = 0;
  let most = 0;
  fetchMapTile.mockImplementation(async () => {
    inFlight += 1;
    most = Math.max(most, inFlight);
    await new Promise((resolve) => setTimeout(resolve, 5));
    inFlight -= 1;
    return lake;
  });
  const row = Array.from({ length: 8 }, (_, x) => ({ z: 9, x, y: 0 }));
  loadMapTiles(row, () => {});
  expect(mapTilesPending()).toBe(8);
  await new Promise((resolve) => setTimeout(resolve, 100));
  expect(most).toBe(3);
  expect(mapTilesPending()).toBe(0);
  row.forEach(({ z, x, y }) => expect(cachedMapTile(z, x, y)).toBeDefined());
});

it('warms tiles up in the background, behind whatever is on screen', async () => {
  const order = [];
  fetchMapTile.mockImplementation(async (z, x) => {
    order.push(x);
    await new Promise((resolve) => setTimeout(resolve, 2));
    return lake;
  });
  warmMapTiles(Array.from({ length: 6 }, (_, i) => ({ z: 7, x: 100 + i, y: 0 })));
  loadMapTiles([{ z: 7, x: 1, y: 0 }, { z: 7, x: 2, y: 0 }], () => {});
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Everything arrives, and what is on screen went ahead of the rest of the
  // warm-up even though it was asked for second.
  expect(cachedMapTile(7, 105, 0)).toBeDefined();
  expect(cachedMapTile(7, 2, 0)).toBeDefined();
  expect(order.indexOf(1)).toBeLessThan(order.indexOf(105));
  expect(order.indexOf(2)).toBeLessThan(order.indexOf(105));
  // Warming up is not what a "loading" sign is for.
  expect(mapTilesPending()).toBe(0);
});

it('erasing forgets tiles in memory and on the phone', async () => {
  await load([tile]);
  expect(mockFiles.size).toBe(1);
  await clearMapTiles();
  expect(cachedMapTile(12, 1138, 1544)).toBeUndefined();
  expect(mockFiles.size).toBe(0);
});
