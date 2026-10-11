import { buildVectorTile } from '../../../test/vectorTile';
import {
  TERRAIN,
  TILE_SIZE,
  base64ToBytes,
  bytesToBase64,
  rasterizeTile,
  tileCoordinates,
} from '../tileRaster';

const at = (grid, col, row) => grid[row * TILE_SIZE + col];
const square = (x1, y1, x2, y2) => [[[x1, y1], [x2, y1], [x2, y2], [x1, y2], [x1, y1]]];
// One grid cell is 32 tile units.
const CELL = 4096 / TILE_SIZE;

it('fills water and leaves the rest land', () => {
  const grid = rasterizeTile(
    buildVectorTile({ water: [{ type: 'polygon', class: 'lake', rings: square(0, 0, 2048, 4096) }] }),
    12
  );
  expect(grid).toHaveLength(TILE_SIZE * TILE_SIZE);
  expect(at(grid, 0, 0)).toBe(TERRAIN.WATER);
  expect(at(grid, 63, 127)).toBe(TERRAIN.WATER);
  expect(at(grid, 64, 0)).toBe(TERRAIN.LAND);
});

it('cuts holes out of polygons', () => {
  const island = square(1024, 1024, 3072, 3072)[0];
  const grid = rasterizeTile(
    buildVectorTile({
      water: [{ type: 'polygon', class: 'ocean', rings: [square(0, 0, 4096, 4096)[0], island] }],
    }),
    12
  );
  expect(at(grid, 5, 5)).toBe(TERRAIN.WATER);
  expect(at(grid, 64, 64)).toBe(TERRAIN.LAND);
});

it('paints what is built over the ground it stands on', () => {
  const grid = rasterizeTile(
    buildVectorTile({
      landcover: [{ type: 'polygon', class: 'wood', rings: square(0, 0, 4096, 4096) }],
      building: [{ type: 'polygon', rings: square(0, 0, 10 * CELL, 10 * CELL) }],
      transportation: [
        { type: 'line', class: 'minor', rings: [[[0, 5 * CELL + 1], [4096, 5 * CELL + 1]]] },
        { type: 'line', class: 'primary', rings: [[[5 * CELL + 1, 0], [5 * CELL + 1, 4096]]] },
        // Not for cars, so not drawn.
        { type: 'line', class: 'path', rings: [[[0, 50 * CELL + 1], [4096, 50 * CELL + 1]]] },
        { type: 'line', class: 'ferry', rings: [[[0, 60 * CELL + 1], [4096, 60 * CELL + 1]]] },
      ],
    }),
    14
  );
  expect(at(grid, 100, 100)).toBe(TERRAIN.WOOD);
  expect(at(grid, 2, 2)).toBe(TERRAIN.BUILDING);
  expect(at(grid, 80, 5)).toBe(TERRAIN.STREET);
  expect(at(grid, 5, 80)).toBe(TERRAIN.ROAD);
  // Main roads run unbroken through the streets they cross.
  expect(at(grid, 5, 5)).toBe(TERRAIN.ROAD);
  expect(at(grid, 80, 50)).toBe(TERRAIN.WOOD);
  expect(at(grid, 80, 60)).toBe(TERRAIN.WOOD);
});

it('brings roads in gradually with zoom', () => {
  const tile = buildVectorTile({
    transportation: [
      { type: 'line', class: 'motorway', rings: [[[0, 5 * CELL + 1], [4096, 5 * CELL + 1]]] },
      { type: 'line', class: 'primary', rings: [[[0, 9 * CELL + 1], [4096, 9 * CELL + 1]]] },
      { type: 'line', class: 'minor', rings: [[[0, 13 * CELL + 1], [4096, 13 * CELL + 1]]] },
    ],
  });
  const roads = (z) => {
    const grid = rasterizeTile(tile, z);
    return [5, 9, 13].map((row) => at(grid, 60, row) !== TERRAIN.LAND);
  };
  expect(roads(4)).toEqual([false, false, false]);
  expect(roads(7)).toEqual([true, false, false]);
  expect(roads(12)).toEqual([true, true, false]);
  expect(roads(14)).toEqual([true, true, true]);
});

it('rejects bytes that are not a tile', () => {
  expect(() => rasterizeTile(new Uint8Array([255, 255, 255, 255]), 10)).toThrow();
});

it('finds the tile a coordinate is in', () => {
  expect(tileCoordinates(0, 0, 1)).toEqual({ x: 1, y: 1 });
  // Carnegie Mellon, at the deepest zoom.
  const { x, y } = tileCoordinates(40.444, -79.943, 14);
  expect([Math.floor(x), Math.floor(y)]).toEqual([4553, 6176]);
});

it('round-trips a raster through base64', () => {
  [0, 1, 2, 3, 100].forEach((length) => {
    const bytes = Uint8Array.from({ length }, (_, i) => (i * 37) % 256);
    expect(Array.from(base64ToBytes(bytesToBase64(bytes)))).toEqual(Array.from(bytes));
  });
  expect(bytesToBase64(Uint8Array.from([72, 105]))).toBe('SGk=');
});
