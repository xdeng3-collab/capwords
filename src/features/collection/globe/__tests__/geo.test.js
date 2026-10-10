import {
  MAX_ZOOM,
  clusterPoints,
  focusOnLatest,
  landCellIndex,
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
  // A crowd on one block still stops at the limit.
  const crowd = Array.from({ length: 20 }, (_, i) => nearPittsburgh(`c${i}`, 0.01 * i));
  expect(zoomWith(crowd)).toBe(MAX_ZOOM);
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
