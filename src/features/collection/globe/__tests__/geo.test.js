import { TERRAIN, TILE_SIZE } from '../../../../utils/tileRaster';
import {
  MAX_ZOOM,
  commonestColour,
  dragOnLevel,
  meshRows,
  clusterPoints,
  focusOnLatest,
  landCellIndex,
  levelFor,
  levelRadius,
  levelTiles,
  MAX_LEVEL,
  MIN_LEVEL,
  paintLevel,
  projectLevel,
  snapScene,
  locatedPoints,
  paintGlobe,
  placeName,
  project,
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
});

describe('close in, as a flat map at fixed levels', () => {
  // The globe zoomed to `zoom` over Pittsburgh, on a 58 x 97 grid.
  const over = (zoom) => ({ lon: -79.943, lat: 40.444, radius: 24.4 * zoom, cx: 29, cy: 48.5 });

  // A tile whose every cell differs from its neighbours, so a picture that is
  // even slightly resampled gives itself away. The pattern repeats every four
  // cells, so it carries on unbroken from one tile into the next.
  const PATTERN = [TERRAIN.LAND, TERRAIN.WOOD, TERRAIN.GRASS, TERRAIN.SAND];
  const patterned = Uint8Array.from({ length: TILE_SIZE * TILE_SIZE }, (_, i) => {
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
  const drawAt = (view, level, tile = () => patterned) => {
    const scene = snapScene(view, level);
    return { scene, lines: paintLevel(scene, level, 58, 97, null, tile) };
  };

  it('radius and level convert both ways', () => {
    expect(levelFor(levelRadius(12, 40.444), 40.444)).toBeCloseTo(12, 9);
    // The same level is a bigger globe nearer the poles, where tiles cover less ground.
    expect(levelRadius(12, 60)).toBeGreaterThan(levelRadius(12, 0));
    expect(MAX_LEVEL).toBeGreaterThan(MIN_LEVEL);
  });

  it('moves the view by less than a cell to square it up', () => {
    const view = over(3000);
    const { scene } = drawAt(view, 13);
    const moved = projectLevel(scene, 13, view.lat, view.lon);
    expect(Math.abs(moved.x - scene.cx)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(moved.y - scene.cy)).toBeLessThanOrEqual(0.5);
    expect(levelFor(scene.radius, scene.lat)).toBeCloseTo(13, 9);
  });

  it("draws the tile's own cells, one for one, right to the corners", () => {
    // Far out as well as close in: a flat map has no edge-of-the-ball squeeze.
    [5, 13].forEach((level) => {
      const { lines } = drawAt(over(3000), level);
      for (let r = 0; r < 96; r += 1) {
        for (let c = 0; c < 57; c += 1) {
          const here = order.indexOf(colourAt(lines, c, r));
          expect(here).toBeGreaterThanOrEqual(0);
          expect(order.indexOf(colourAt(lines, c + 1, r))).toBe((here + 1) % 4);
          expect(order.indexOf(colourAt(lines, c, r + 1))).toBe((here + 2) % 4);
        }
      }
    });
  });

  it('is the same picture after a drag, just moved by whole cells', () => {
    [5, 13].forEach((level) => {
      const from = over(3000);
      const first = drawAt(from, level);
      // Dragged by no round number of cells.
      const step = 360 / (TILE_SIZE * 2 ** level);
      const to = { ...from, lon: from.lon + 21.3 * step, lat: from.lat - 12.6 * step };
      const second = drawAt(to, level);
      const at = projectLevel(second.scene, level, first.scene.lat, first.scene.lon);
      const dx = at.x - second.scene.cx;
      const dy = at.y - second.scene.cy;
      expect(dx).toBeCloseTo(Math.round(dx), 6);
      expect(dy).toBeCloseTo(Math.round(dy), 6);
      expect(Math.round(dx)).toBeLessThan(-15);
      expect(Math.round(dy)).toBeLessThan(-5);
      // Every cell both pictures show is the same in both.
      for (let r = 0; r < 97; r += 1) {
        for (let c = 0; c < 58; c += 1) {
          const [c2, r2] = [c + Math.round(dx), r + Math.round(dy)];
          if (c2 >= 0 && c2 < 58 && r2 >= 0 && r2 < 97) {
            expect(colourAt(second.lines, c2, r2)).toBe(colourAt(first.lines, c, r));
          }
        }
      }
    });
  });

  it('a drag moves the map exactly with the finger, and stays on its level', () => {
    [5, 11.4, 13].forEach((level) => {
      const from = { lat: 40.444, lon: -79.943 };
      // Dragged right and a long way down: the view moves west and north.
      const to = dragOnLevel(level, from.lat, from.lon, 30, 200);
      expect(to.lon).toBeLessThan(from.lon);
      expect(to.lat).toBeGreaterThan(from.lat);
      // The place that was in the middle is now 30 cells right, 200 down.
      const moved = projectLevel({ ...to, cx: 0, cy: 0 }, level, from.lat, from.lon);
      expect(moved.x).toBeCloseTo(30, 6);
      expect(moved.y).toBeCloseTo(200, 6);
      // The ball that matches the map is a different size up there - which
      // is why the zoom has to follow the level rather than the other way.
      expect(levelRadius(level, to.lat)).toBeGreaterThan(levelRadius(level, from.lat));
      expect(levelFor(levelRadius(level, to.lat), to.lat)).toBeCloseTo(level, 9);
      expect(levelFor(levelRadius(level, from.lat), to.lat)).toBeLessThan(level);
    });
    // It stops short of the poles, and wraps round the date line.
    expect(dragOnLevel(4, 80, 0, 0, 5000).lat).toBe(85);
    expect(dragOnLevel(4, 0, 179, -100, 0).lon).toBeCloseTo(-163.42, 1);
  });

  it('past the deepest tiles, draws each tile cell two screen cells across', () => {
    const { lines } = drawAt(over(3000), 15);
    const asked = [];
    drawAt(over(3000), 15, (z) => {
      asked.push(z);
      return patterned;
    });
    expect(new Set(asked)).toEqual(new Set([14]));
    // Somewhere along a row, pairs of cells share a colour.
    const row = Array.from({ length: 20 }, (_, c) => colourAt(lines, c, 40));
    const pairs = row.filter((colour, c) => c % 2 === 0 && row[c + 1] !== undefined && colour === row[c + 1]);
    const offPairs = row.filter((colour, c) => c % 2 === 1 && row[c + 1] !== undefined && colour === row[c + 1]);
    expect(Math.max(pairs.length, offPairs.length)).toBeGreaterThanOrEqual(9);
  });

  it('draws from a coarser tile over the same ground until the right one arrives', () => {
    const street = new Uint8Array(TILE_SIZE * TILE_SIZE).fill(TERRAIN.STREET);
    const colours = (tile) =>
      new Set(drawAt(over(3000), 13, tile).lines.join(',').split(',').map((run) => run.split(':')[2]));
    // No tiles at all: plain land from the mask.
    expect([...colours(() => undefined)]).toEqual(['5']);
    expect([...colours(() => street)]).toEqual(['13']);
    // Only an overview six levels up has arrived: use that.
    expect([...colours((z) => (z === 7 ? street : undefined))]).toEqual(['13']);
    expect([...colours((z) => (z === 6 ? street : undefined))]).toEqual(['5']);
  });

  it('asks for the few tiles in view, the middle one first', () => {
    const scene = snapScene(over(3000), 14);
    const tiles = levelTiles(scene, 14, 58, 97);
    expect(tiles[0]).toEqual({ z: 14, x: 4553, y: 6176 });
    expect(tiles.length).toBeLessThanOrEqual(4);
    // One level past the deepest tiles, it is still those tiles.
    const deeper = levelTiles(snapScene(over(3000), 15), 15, 58, 97);
    expect(deeper[0]).toEqual({ z: 14, x: 4553, y: 6176 });
    // Across the date line the tile numbers wrap.
    const pacific = snapScene({ lon: 180, lat: 0, radius: 1, cx: 29, cy: 48.5 }, 6);
    const xs = new Set(levelTiles(pacific, 6, 58, 97).map((tile) => tile.x));
    expect(xs).toEqual(new Set([63, 0]));
  });

  it('puts pins on the flat map, the short way round the world', () => {
    const scene = snapScene({ lon: 179.9, lat: 0, radius: 1, cx: 29, cy: 48.5 }, 6);
    const east = projectLevel(scene, 6, 0, -179.9);
    expect(east.x).toBeGreaterThan(scene.cx);
    expect(east.x - scene.cx).toBeLessThan(10);
    const clusters = clusterPoints(
      [point('here', 0, 179.9), point('over the line', 0.01, -179.95)],
      scene,
      58,
      97,
      5,
      6
    );
    expect(clusters.map((c) => c.items.length)).toEqual([2]);
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
