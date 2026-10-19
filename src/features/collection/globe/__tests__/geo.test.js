import {
  MAX_ZOOM,
  clusterOnRegion,
  clusterPoints,
  focusOnLatest,
  globeRadiusForRegion,
  landCellIndex,
  locatedPoints,
  meshRows,
  paintGlobe,
  placeName,
  project,
  regionForGlobe,
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

it('merges runs that stack into rectangles', () => {
  const lines = ['0:4:5', '0:2:5,2:2:2', '0:2:5,2:2:2', '', '1:1:2'];
  // column, row, width, height, colour
  expect(meshRows(lines)).toEqual([
    0, 0, 4, 1, 5,
    0, 1, 2, 2, 5,
    2, 1, 2, 2, 2,
    1, 4, 1, 1, 2,
  ]);
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

describe('handing over to the system map', () => {
  const W = 348;
  const H = 578;
  const CELL = 6;
  // The open globe's radius in cells at zoom 1, as GlobeView sizes it.
  const R = (W / CELL) * 0.42;

  it('turns the globe into a region and back', () => {
    [2.6, 40, 3000].forEach((zoom) => {
      const region = regionForGlobe(40.444, -79.943, R * zoom, W, H, CELL);
      expect(globeRadiusForRegion(region, W, CELL) / R).toBeCloseTo(zoom, 9);
      expect(region.latitude).toBeCloseTo(40.444, 9);
      expect(region.longitude).toBeCloseTo(-79.943, 9);
      // Taller than wide on a tall screen, at least in latitude.
      expect(region.latitudeDelta).toBeGreaterThan(0);
    });
    // Twice as close shows half as much.
    const near = regionForGlobe(40.444, -79.943, R * 80, W, H, CELL);
    const far = regionForGlobe(40.444, -79.943, R * 40, W, H, CELL);
    expect(far.longitudeDelta / near.longitudeDelta).toBeCloseTo(2, 9);
  });

  it('matches the size of the ball at the middle of the screen', () => {
    // A degree of longitude across the middle of the ball, in points...
    const zoom = 500;
    const scene = { lon: -79.943, lat: 40.444, radius: R * zoom, cx: 0, cy: 0 };
    const a = project(scene, 40.444, -79.943);
    const b = project(scene, 40.444, -79.933);
    const ballPts = ((b.x - a.x) * CELL) / 0.01;
    // ...is the same on the map.
    const region = regionForGlobe(40.444, -79.943, R * zoom, W, H, CELL);
    expect(W / region.longitudeDelta).toBeCloseTo(ballPts, 0);
  });

  it('never asks the map for more than the world', () => {
    const region = regionForGlobe(10, 20, R * 0.5, W, H, CELL);
    expect(region.longitudeDelta).toBeLessThanOrEqual(360);
    expect(region.latitudeDelta).toBeLessThanOrEqual(170);
  });

  it('clusters photos as they would sit on that map', () => {
    const region = regionForGlobe(40.444, -79.943, R * 3000, W, H, CELL);
    const points = [
      point('newest', 40.444, -79.943),
      point('next door', 40.4441, -79.9431),
      point('across town', 40.452, -79.935),
      point('elsewhere', 31.23, 121.47),
    ];
    const clusters = clusterOnRegion(points, region, W, H, 40);
    expect(clusters.map((c) => [c.id, c.items.map((s) => s.id)])).toEqual([
      ['newest', ['newest', 'next door']],
      ['across town', ['across town']],
    ]);
    // The newest sits in the middle of the screen.
    expect(clusters[0].x).toBeCloseTo(W / 2, 6);
    expect(clusters[0].y).toBeCloseTo(H / 2, 0);
    // North is up, east is right.
    expect(clusters[1].x).toBeGreaterThan(W / 2);
    expect(clusters[1].y).toBeLessThan(H / 2);
  });

  it('finds photos across the date line', () => {
    const region = regionForGlobe(0, 179.99, R * 300, W, H, CELL);
    const clusters = clusterOnRegion([point('east of the line', 0, -179.99)], region, W, H, 40);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].x).toBeGreaterThan(W / 2);
  });
});
