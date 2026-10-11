import { TERRAIN, TILE_SIZE } from '../../../../utils/tileRaster';
import {
  MAX_ZOOM,
  commonestColour,
  meshRows,
  clusterPoints,
  focusOnLatest,
  landCellIndex,
  levelFor,
  levelRadius,
  snapScene,
  locatedPoints,
  paintGlobe,
  placeName,
  project,
  tileZoomFor,
  unproject,
  visibleTiles,
} from '../geo';
import { landMask } from '../landMask';

const scene = { lon: 20, lat: 30, radius: 25, cx: 30, cy: 40 };
const point = (id, latitude, longitude) => ({
  id,
  latitude,
  longitude,
  sticker: { id, location: { latitude, longitude } },
});
// Roughly `km` north of Pittsburgh.
const nearPittsburgh = (id, km) => point(id, 40.44 + km / 111, -80);

it('knows land from sea', () => {
  const mask = landMask();
  expect(mask[landCellIndex(40.44, -80)]).toBe(1); // Pittsburgh
  expect(mask[landCellIndex(39.9, 116.4)]).toBe(1); // Beijing
  expect(mask[landCellIndex(-25, 135)]).toBe(1); // central Australia
  expect(mask[landCellIndex(0, -150)]).toBe(0); // mid Pacific
  expect(mask[landCellIndex(35, -40)]).toBe(0); // mid Atlantic
});

it('puts the point facing the viewer at the centre, and north of it above', () => {
  expect(project(scene, scene.lat, scene.lon)).toEqual({ x: scene.cx, y: scene.cy });
  const north = project(scene, scene.lat + 10, scene.lon);
  expect(north.x).toBeCloseTo(scene.cx, 6);
  expect(north.y).toBeLessThan(scene.cy);
  expect(project(scene, scene.lat, scene.lon + 10).x).toBeGreaterThan(scene.cx);
});

it('hides what is on the far side of the globe', () => {
  expect(project(scene, -30, -160)).toBeNull();
  expect(unproject(scene, 0, 0)).toBeNull();
});

it('projects a coordinate to the grid and back', () => {
  const at = project(scene, 48.85, 2.35);
  const back = unproject(scene, at.x, at.y);
  expect(back.latitude).toBeCloseTo(48.85, 5);
  expect(back.longitude).toBeCloseTo(2.35, 5);
});

describe('map tiles', () => {
  // The globe zoomed to `zoom` over Pittsburgh, on a 58 x 97 grid.
  const over = (zoom) => ({ lon: -79.943, lat: 40.444, radius: 24.4 * zoom, cx: 29, cy: 48.5 });

  it('uses none far out, and deeper ones the closer the globe gets', () => {
    expect(tileZoomFor(over(1))).toBeNull();
    expect(tileZoomFor(over(4))).toBeNull();
    const found = [20, 200, 2000, 20000].map((zoom) => tileZoomFor(over(zoom)));
    const zooms = found.map((tiles) => tiles.z);
    expect(zooms).toEqual([...zooms].sort((a, b) => a - b));
    expect(zooms[0]).toBeGreaterThanOrEqual(4);
    expect(zooms[3]).toBe(14); // as deep as tiles go
    // Tile cells are never coarser than the screen's until tiles run out...
    found.slice(0, 3).forEach(({ spread }) => {
      expect(spread).toBeGreaterThanOrEqual(1);
      expect(spread).toBeLessThan(2);
    });
    // ...after which one tile cell is spread over several screen cells.
    expect(tileZoomFor(over(26000)).spread).toBeLessThan(1);
  });

  it('never loses a road between samples', () => {
    // Two tile cells per screen cell, and a street only one tile cell wide.
    const close = over(5000);
    const { z } = tileZoomFor(close);
    const tile = new Uint8Array(TILE_SIZE * TILE_SIZE);
    for (let row = 0; row < TILE_SIZE; row += 1) tile[row * TILE_SIZE + 77] = TERRAIN.STREET;
    const street = '13';
    [1, 1.5, 1.99].forEach((spread) => {
      const lines = paintGlobe(close, 58, 97, null, { z, spread, tile: () => tile });
      const withStreet = lines.filter((line) => line.split(',').some((run) => run.endsWith(`:${street}`)));
      // The street crosses the view top to bottom without a gap.
      expect(withStreet).toHaveLength(lines.length);
    });
  });

  it('reads tiles off patches exactly as it would cell by cell', () => {
    // A tile where every cell is different from its neighbours, so a cell
    // read even slightly off shows. The far side of the date line and the
    // globe's edge are where patches give up and cells are looked up singly.
    const tile = Uint8Array.from({ length: TILE_SIZE * TILE_SIZE }, (_, i) => {
      const [x, y] = [i % TILE_SIZE, Math.floor(i / TILE_SIZE)];
      return [TERRAIN.LAND, TERRAIN.WATER, TERRAIN.WOOD][(x + 2 * y) % 3];
    });
    const coloursOf = (scene, z) =>
      paintGlobe(scene, 58, 97, null, { z, spread: 0.5, tile: () => tile });

    // Street level: a cell is half a tile cell, so a slip of a cell would show.
    const close = over(26000);
    const lines = coloursOf(close, 14);
    const cells = lines.join(',').split(',').length;
    expect(cells).toBeGreaterThan(500);
    // Shifting the view by exactly one screen cell shifts the picture by one.
    const shifted = coloursOf({ ...close, cx: close.cx + 1 }, 14);
    const colourAt = (rows, c, r) => {
      const run = rows[r].split(',').find((text) => {
        const [start, length] = text.split(':').map(Number);
        return c >= start && c < start + length;
      });
      return run.split(':')[2];
    };
    for (let r = 3; r < 97; r += 7) {
      for (let c = 3; c < 56; c += 5) {
        expect(colourAt(shifted, c + 1, r)).toBe(colourAt(lines, c, r));
      }
    }
    // Across the date line nothing is torn.
    const pacific = { lon: 180, lat: 0, radius: 24.4 * 40, cx: 29, cy: 48.5 };
    const row = coloursOf(pacific, 6)[48];
    expect(row.split(',').every((run) => ['2', '5', '6'].includes(run.split(':')[2]))).toBe(true);
  });

  describe('at a fixed level', () => {
    // A tile whose every cell differs from its neighbours, so a picture that
    // is even slightly resampled gives itself away. The pattern repeats every
    // four cells, so it carries on unbroken from one tile into the next.
    const PATTERN = [TERRAIN.LAND, TERRAIN.WOOD, TERRAIN.GRASS, TERRAIN.SAND];
    const tile = Uint8Array.from({ length: TILE_SIZE * TILE_SIZE }, (_, i) => {
      const [x, y] = [i % TILE_SIZE, Math.floor(i / TILE_SIZE)];
      return PATTERN[(x + 2 * y) % 4];
    });
    // The colour slots those four are drawn in, in the same order.
    const order = [5, 6, 4, 10];
    const colourAt = (rows, c, r) => {
      const run = rows[r].split(',').find((text) => {
        const [start, length] = text.split(':').map(Number);
        return c >= start && c < start + length;
      });
      return Number(run.split(':')[2]);
    };
    const drawAt = (view, level) => {
      const scene = snapScene(view, level);
      const lines = paintGlobe(scene, 58, 97, null, { ...tileZoomFor(scene), tile: () => tile });
      return { scene, lines };
    };

    it('radius and level convert both ways', () => {
      expect(levelFor(levelRadius(12, 40.444), 40.444)).toBeCloseTo(12, 9);
      // The same level is a bigger globe nearer the poles, where tiles cover less ground.
      expect(levelRadius(12, 60)).toBeGreaterThan(levelRadius(12, 0));
    });

    it('uses exactly one tile cell per screen cell, and half of one past the deepest tiles', () => {
      expect(tileZoomFor(snapScene(over(3000), 12))).toMatchObject({ z: 12 });
      expect(tileZoomFor(snapScene(over(3000), 12)).spread).toBeCloseTo(1, 6);
      expect(tileZoomFor(snapScene(over(3000), 15)).z).toBe(14);
      expect(tileZoomFor(snapScene(over(3000), 15)).spread).toBeCloseTo(0.5, 6);
    });

    it('moves the view by less than a cell to square it up', () => {
      const view = over(3000);
      const { scene } = drawAt(view, 13);
      const moved = project(scene, view.lat, view.lon);
      expect(Math.abs(moved.x - scene.cx)).toBeLessThanOrEqual(0.5);
      expect(Math.abs(moved.y - scene.cy)).toBeLessThanOrEqual(0.5);
    });

    it("draws the tile's own cells, one for one", () => {
      const { lines } = drawAt(over(3000), 13);
      // Neighbouring screen cells show neighbouring tile cells: the pattern
      // survives intact, which no resampling would manage.
      for (let r = 30; r < 66; r += 1) {
        for (let c = 12; c < 46; c += 1) {
          const here = order.indexOf(colourAt(lines, c, r));
          expect(here).toBeGreaterThanOrEqual(0);
          expect(order.indexOf(colourAt(lines, c + 1, r))).toBe((here + 1) % 4);
          expect(order.indexOf(colourAt(lines, c, r + 1))).toBe((here + 2) % 4);
        }
      }
    });

    it('is the same picture after a drag, just moved by whole cells', () => {
      const from = over(3000);
      const first = drawAt(from, 13);
      // Dragged a few hundred metres, by no round number of cells.
      const second = drawAt({ ...from, lon: from.lon + 0.00731, lat: from.lat - 0.00412 }, 13);
      const at = project(second.scene, first.scene.lat, first.scene.lon);
      const dx = at.x - second.scene.cx;
      const dy = at.y - second.scene.cy;
      expect(dx).toBeCloseTo(Math.round(dx), 2);
      expect(dy).toBeCloseTo(Math.round(dy), 2);
      expect(Math.abs(Math.round(dx)) + Math.abs(Math.round(dy))).toBeGreaterThan(5);
      for (let r = 35; r < 60; r += 3) {
        for (let c = 30; c < 52; c += 3) {
          expect(colourAt(second.lines, c + Math.round(dx), r + Math.round(dy))).toBe(
            colourAt(first.lines, c, r)
          );
        }
      }
    });
  });

  it('asks for the few tiles in view, the middle one first', () => {
    const close = over(14000);
    const tiles = visibleTiles(close, 58, 97, 14);
    expect(tiles[0]).toEqual({ z: 14, x: 4553, y: 6176 });
    expect(tiles.length).toBeLessThanOrEqual(6);
    tiles.forEach((tile) => {
      expect(Math.abs(tile.x - 4553)).toBeLessThanOrEqual(1);
      expect(Math.abs(tile.y - 6176)).toBeLessThanOrEqual(1);
    });
  });

  it('draws from a tile where there is one and the land mask where there is not', () => {
    const close = over(14000);
    const street = new Uint8Array(TILE_SIZE * TILE_SIZE).fill(TERRAIN.STREET);
    const colours = (detail) =>
      new Set(
        paintGlobe(close, 58, 97, null, detail)
          .join(',')
          .split(',')
          .map((run) => run.split(':')[2])
      );

    // No tiles yet: plain land.
    expect([...colours({ z: 14, spread: 1, tile: () => undefined })]).toEqual(['5']);
    // Every tile is all street.
    expect([...colours({ z: 14, spread: 1, tile: () => street })]).toEqual(['13']);
    // Only a coarser tile over the same ground has arrived: use that.
    const coarse = { z: 14, spread: 1, tile: (z) => (z === 12 ? street : undefined) };
    expect([...colours(coarse)]).toEqual(['13']);
  });
});

it('paints rows as runs that cover only the globe', () => {
  const lines = paintGlobe(scene, 60, 80, null);
  expect(lines).toHaveLength(80);
  expect(lines[0]).toBe(''); // above the globe: empty space
  const middle = lines[40].split(',').map((run) => run.split(':').map(Number));
  expect(middle[0][0]).toBe(4); // one outline cell left of the disc
  const last = middle[middle.length - 1];
  expect(last[0] + last[1]).toBe(56);
  // Runs are contiguous.
  middle.slice(1).forEach(([start], i) => expect(start).toBe(middle[i][0] + middle[i][1]));
});

it('merges runs that stack into rectangles, and can leave a backdrop colour out', () => {
  const lines = ['0:4:5', '0:2:5,2:2:2', '0:2:5,2:2:2', '', '1:1:2'];
  expect(commonestColour(lines)).toBe(5);
  // column, row, width, height, colour
  expect(meshRows(lines)).toEqual([
    0, 0, 4, 1, 5,
    0, 1, 2, 2, 5,
    2, 1, 2, 2, 2,
    1, 4, 1, 1, 2,
  ]);
  expect(meshRows(lines, 5)).toEqual([2, 1, 2, 2, 2, 1, 4, 1, 1, 2]);
});

it('skips stickers that have no location', () => {
  const points = locatedPoints([
    { id: 'a', location: { latitude: 1, longitude: 2, place: 'X' } },
    { id: 'b', location: null },
    { id: 'c' },
  ]);
  expect(points.map((p) => p.id)).toEqual(['a']);
});

it('flies to the newest photo', () => {
  expect(focusOnLatest([])).toBeNull();
  const focus = focusOnLatest([point('new', 31.2, 121.5), point('old', 40.44, -80)]);
  expect(focus).toMatchObject({ latitude: 31.2, longitude: 121.5, nearbyCount: 0 });
});

it('zooms in further the more photos are nearby, and the closer they are', () => {
  const latest = nearPittsburgh('latest', 0);
  const zoomWith = (others) => focusOnLatest([latest, ...others]).zoom;

  const alone = zoomWith([]);
  const one = zoomWith([nearPittsburgh('a', 5)]);
  const three = zoomWith([5, 6, 7].map((km) => nearPittsburgh(`n${km}`, km)));
  const threeTight = zoomWith([1, 2, 3].map((km) => nearPittsburgh(`t${km}`, km)));
  expect(one).toBeGreaterThan(alone);
  expect(three).toBeGreaterThan(one);
  expect(threeTight).toBeGreaterThan(three);

  // Photos in another city do not count.
  expect(zoomWith([point('far', 34, -118)])).toBe(alone);
  // A crowd on one block flies to street level and no further.
  const crowd = (n) => Array.from({ length: n }, (_, i) => nearPittsburgh(`c${i}`, 0.01 * i));
  expect(zoomWith(crowd(20))).toBeGreaterThan(10000);
  expect(zoomWith(crowd(20))).toBeLessThanOrEqual(MAX_ZOOM);
  expect(zoomWith(crowd(40))).toBe(zoomWith(crowd(20)));
});

it('clusters photos that would overlap, keyed by the newest', () => {
  const points = [point('new', 30, 20), point('close', 30.5, 20.5), point('away', 55, 60)];
  const clusters = clusterPoints(points, scene, 60, 80, 3);
  expect(clusters.map((c) => [c.id, c.items.map((s) => s.id)])).toEqual([
    ['new', ['new', 'close']],
    ['away', ['away']],
  ]);
  // Zoomed in, they separate; the far one leaves the grid.
  const zoomed = clusterPoints(points, { ...scene, radius: 2500 }, 60, 80, 3);
  expect(zoomed.map((c) => c.id)).toEqual(['new', 'close']);
});

it('names a cluster after the place most of its photos share', () => {
  const at = (place) => ({ location: { place } });
  expect(placeName([at('Pittsburgh, PA'), at('Oakland, PA'), at('Pittsburgh, PA')])).toBe(
    'Pittsburgh, PA'
  );
  expect(placeName([{ location: null }, {}])).toBeNull();
});
