import { TERRAIN, TILE_MAX_ZOOM, TILE_SIZE } from '../../../utils/tileRaster';
import { LAND_COLS, LAND_ROWS, landMask } from './landMask';

/**
 * The geometry behind the Book's globe. Pure: no React, no storage.
 *
 * The globe is an orthographic projection - the Earth seen from far away -
 * painted one square cell at a time. A `scene` says where it sits on the cell
 * grid: { lon, lat } is the point facing the viewer (degrees), `radius` the
 * globe's radius in cells, and { cx, cy } its centre in cells.
 * `shading` (0 to 1, default 1) is how strongly it is lit as a ball.
 */

const RAD = Math.PI / 180;
const EARTH_RADIUS_KM = 6371;

/** How far the globe can be pinched in; a few blocks across the screen. */
export const MAX_ZOOM = 40000;
export const MIN_ZOOM = 1;

// Opening the globe flies to the newest photo. How close it flies depends on
// how many other photos are around it: each one within NEARBY_KM pulls the
// camera in further, the closer the stronger, up to FOCUS_NEIGHBOURS of them.
const NEARBY_KM = 100;
const FOCUS_NEIGHBOURS = 5;
const CLOSEST_KM = 0.25;
// The fraction of the globe's on-screen radius the neighbourhood should fill.
const FOCUS_FILL = 0.55;

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/** Longitude folded into [-180, 180). */
export function wrapLongitude(lon) {
  return ((((lon + 180) % 360) + 360) % 360) - 180;
}

/** Stickers that know where they were taken, as points the globe can place. */
export function locatedPoints(stickers) {
  return stickers
    .filter(
      (s) => Number.isFinite(s.location?.latitude) && Number.isFinite(s.location?.longitude)
    )
    .map((sticker) => ({
      id: sticker.id,
      latitude: sticker.location.latitude,
      longitude: sticker.location.longitude,
      sticker,
    }));
}

/** The land-mask cell a coordinate falls in. */
export function landCellIndex(latitude, longitude) {
  const col = Math.floor((wrapLongitude(longitude) + 180) * (LAND_COLS / 360)) % LAND_COLS;
  const row = clamp(Math.floor((90 - latitude) * (LAND_ROWS / 180)), 0, LAND_ROWS - 1);
  return row * LAND_COLS + col;
}

/**
 * Where a coordinate lands on the cell grid, or null when it is on the far
 * side of the globe.
 */
export function project(scene, latitude, longitude) {
  const phi = latitude * RAD;
  const phi0 = scene.lat * RAD;
  const dLambda = (longitude - scene.lon) * RAD;
  const cosPhi = Math.cos(phi);
  const depth =
    Math.sin(phi0) * Math.sin(phi) + Math.cos(phi0) * cosPhi * Math.cos(dLambda);
  if (depth <= 0.05) return null;
  const x = cosPhi * Math.sin(dLambda);
  const y = Math.cos(phi0) * Math.sin(phi) - Math.sin(phi0) * cosPhi * Math.cos(dLambda);
  return { x: scene.cx + scene.radius * x, y: scene.cy - scene.radius * y };
}

/** The coordinate under a point on the cell grid, or null if it misses the globe. */
export function unproject(scene, x, y) {
  const nx = (x - scene.cx) / scene.radius;
  const ny = -(y - scene.cy) / scene.radius;
  const d2 = nx * nx + ny * ny;
  if (d2 > 1) return null;
  const nz = Math.sqrt(1 - d2);
  const phi0 = scene.lat * RAD;
  const latitude = Math.asin(clamp(ny * Math.cos(phi0) + nz * Math.sin(phi0), -1, 1)) / RAD;
  const longitude =
    scene.lon + Math.atan2(nx, nz * Math.cos(phi0) - ny * Math.sin(phi0)) / RAD;
  return { latitude, longitude: wrapLongitude(longitude) };
}

// Colour slots. Ocean, land and ice come in three tones (lit, mid, shaded);
// the rest only appear close up, where the globe is no longer shaded.
// See GLOBE_COLORS.
const OUTLINE = 0;
const OCEAN = 1;
const LAND = 4;
const ICE = 7;
const SAND = 10;
const BUILDING = 11;
const ROAD = 12;
const STREET = 13;

// Which slot each terrain class of a map tile is drawn in.
const TERRAIN_SLOT = [];
TERRAIN_SLOT[TERRAIN.LAND] = LAND + 1;
TERRAIN_SLOT[TERRAIN.WATER] = OCEAN + 1;
TERRAIN_SLOT[TERRAIN.WOOD] = LAND + 2;
TERRAIN_SLOT[TERRAIN.GRASS] = LAND;
TERRAIN_SLOT[TERRAIN.ICE] = ICE;
TERRAIN_SLOT[TERRAIN.SAND] = SAND;
TERRAIN_SLOT[TERRAIN.BUILDING] = BUILDING;
TERRAIN_SLOT[TERRAIN.ROAD] = ROAD;
TERRAIN_SLOT[TERRAIN.STREET] = STREET;

// Map tiles are Web Mercator, which runs out towards the poles.
const TILE_LAT_LIMIT = 85;
// The shallowest tiles worth fetching; below this the built-in land mask is
// as good, and the tiles are at their heaviest.
const TILE_MIN_ZOOM = 4;
// A tile that has not arrived is drawn from a coarser one covering the same
// ground, up to this many levels up.
const TILE_FALLBACK_LEVELS = 3;

// When several tile cells fall under one screen cell, the one that would be
// missed most wins: a road must not vanish because it fell between samples.
const TERRAIN_PRIORITY = new Array(Object.keys(TERRAIN).length).fill(0);
TERRAIN_PRIORITY[TERRAIN.BUILDING] = 1;
TERRAIN_PRIORITY[TERRAIN.WATER] = 2;
TERRAIN_PRIORITY[TERRAIN.STREET] = 3;
TERRAIN_PRIORITY[TERRAIN.ROAD] = 4;

/**
 * Close in, the globe is drawn at fixed levels, like any map: at level L one
 * screen cell is exactly one cell of a zoom-L map tile. Each level is then a
 * fixed picture, which dragging only slides and pinching only stretches -
 * rather than a fresh sampling of the map every frame, which shimmers.
 *
 * Levels start where tiles become worth having and run one past the deepest
 * tiles, where each tile cell is drawn two screen cells across.
 */
export const MIN_LEVEL = TILE_MIN_ZOOM;
export const MAX_LEVEL = TILE_MAX_ZOOM + 1;

const tileStretch = (lat) => Math.cos(clamp(lat, -TILE_LAT_LIMIT, TILE_LAT_LIMIT) * RAD);

/** The level, fractional, that a globe of this radius (in cells) is at. */
export function levelFor(radius, lat) {
  return Math.log2((radius * 360 * tileStretch(lat)) / (TILE_SIZE * 57.2958));
}

/** The radius, in cells, at which the globe is exactly at `level`. */
export function levelRadius(level, lat) {
  return (2 ** level * TILE_SIZE * 57.2958) / (360 * tileStretch(lat));
}

/**
 * The scene redrawn at exactly `level`, nudged by less than a cell so that
 * its cells sit squarely on the map's. Whatever is drawn from it is the
 * tiles' own pixels, and stays the same picture however the view got there.
 */
export function snapScene(scene, level) {
  const around = TILE_SIZE * 2 ** level; // cells round the world at this level
  const [u, v] = tileXY(clamp(scene.lat, -TILE_LAT_LIMIT, TILE_LAT_LIMIT), scene.lon, around);
  const x = Math.round(u - scene.cx) + scene.cx;
  const y = Math.round(v - scene.cy) + scene.cy;
  const lat = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / around))) / RAD;
  return { ...scene, lon: (x / around) * 360 - 180, lat, radius: levelRadius(level, lat) };
}

/**
 * Which map tiles suit the globe at this scene: { z, spread }, or null while
 * it is too far out for tiles to add anything. `z` is the shallowest zoom
 * whose cells are no bigger than the globe's, and `spread` how many of them
 * (1 to 2, or fewer past the deepest zoom) lie across one screen cell.
 */
export function tileZoomFor(scene) {
  const exact = levelFor(scene.radius, scene.lat);
  // A scene snapped to a level is a hair off a whole number either way.
  const z = Math.min(Math.ceil(exact - 1e-6), TILE_MAX_ZOOM);
  return z < TILE_MIN_ZOOM ? null : { z, spread: 2 ** (z - exact) };
}

function tileXY(latitude, longitude, n) {
  const sin = Math.sin(latitude * RAD);
  return [
    ((longitude + 180) / 360) * n,
    (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * n,
  ];
}

/**
 * The tiles at zoom `z` that the grid is looking at, nearest the middle
 * first: [{ z, x, y }].
 */
export function visibleTiles(scene, cols, rows, z) {
  const n = 2 ** z;
  const found = new Map();
  const STEP = 6;
  for (let r = 0; r <= rows + STEP; r += STEP) {
    for (let c = 0; c <= cols + STEP; c += STEP) {
      const at = unproject(scene, Math.min(c, cols), Math.min(r, rows));
      if (!at || Math.abs(at.latitude) >= TILE_LAT_LIMIT) continue;
      const [xt, yt] = tileXY(at.latitude, at.longitude, n);
      const x = Math.floor(xt);
      const y = Math.floor(yt);
      const key = y * n + x;
      if (!found.has(key)) {
        const distance = (c - scene.cx) ** 2 + (r - scene.cy) ** 2;
        found.set(key, { z, x, y, distance });
      } else {
        const tile = found.get(key);
        tile.distance = Math.min(tile.distance, (c - scene.cx) ** 2 + (r - scene.cy) ** 2);
      }
    }
  }
  return [...found.values()]
    .sort((a, b) => a.distance - b.distance)
    .map(({ x, y }) => ({ z, x, y }));
}

// Cheap integer hash to [0, 100), for the specks that give flat sea and land
// some texture - and make it visible that the globe is turning.
function speckle(i, j, level) {
  let h = (Math.imul(i, 73856093) ^ Math.imul(j, 19349663) ^ Math.imul(level, 83492791)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return h % 100;
}

/**
 * Paint the globe onto a `cols` x `rows` grid. Returns one string per row:
 * runs of same-coloured cells as "start:length:colour" joined by commas, with
 * empty space left out. Strings, so a row that did not change between frames
 * compares equal and is not drawn again.
 *
 * `extraLand` is a Set of land-mask cells to treat as land whatever the map
 * says - the mask is too coarse to know a harbour city from open sea.
 *
 * `detail`, when given, is { z, spread, tile(z, x, y) }: draw from map tiles
 * at zoom `z` (see tileZoomFor) wherever `tile` has one, or a coarser one over
 * the same ground, to hand - and from the land mask wherever it does not.
 */
export function paintGlobe(scene, cols, rows, extraLand, detail) {
  const mask = landMask();
  const { radius, cx, cy } = scene;
  const phi0 = scene.lat * RAD;
  const sinPhi0 = Math.sin(phi0);
  const cosPhi0 = Math.cos(phi0);
  // Seen whole, the globe is shaded as a ball. Close up that shading would
  // just be a diagonal stripe across the map, so `scene.shading` fades it out.
  const shading = scene.shading ?? 1;
  const outer = (radius + 1) * (radius + 1);
  const inner = radius * radius;

  // Specks sit on a fixed lattice in map space, and only while the globe is
  // still a ball: close up they would be noise over the map.
  const level = 1;
  const lattice = 2;
  const specks = shading > 0;

  // Neighbouring cells nearly always share a tile, so remember the last one.
  const tilesAcross = detail ? 2 ** detail.z : 0;
  let lastX = -1;
  let lastY = -1;
  let lastTile = null;
  let lastLevelsUp = 0;
  const terrainAt = (xt, yt) => {
    const x = Math.floor(xt);
    const y = Math.floor(yt);
    if (x !== lastX || y !== lastY) {
      lastX = x;
      lastY = y;
      lastTile = null;
      for (let up = 0; up <= TILE_FALLBACK_LEVELS && up <= detail.z && !lastTile; up += 1) {
        lastTile = detail.tile(detail.z - up, x >> up, y >> up) || null;
        lastLevelsUp = up;
      }
    }
    if (!lastTile) return -1;
    const shrink = 2 ** lastLevelsUp;
    // Position inside the tile, in its cells.
    const u = (xt / shrink - Math.floor(xt / shrink)) * TILE_SIZE;
    const v = (yt / shrink - Math.floor(yt / shrink)) * TILE_SIZE;
    // The tile cells this screen cell covers: one, or up to two each way.
    const half = Math.min(1, detail.spread / shrink) / 2 - 0.001;
    const u1 = Math.min(TILE_SIZE - 1, Math.floor(u + half));
    const v1 = Math.min(TILE_SIZE - 1, Math.floor(v + half));
    const u0 = Math.max(0, Math.floor(u - half));
    let best = lastTile[Math.floor(v) * TILE_SIZE + Math.floor(u)];
    for (let tv = Math.max(0, Math.floor(v - half)); tv <= v1; tv += 1) {
      for (let tu = u0; tu <= u1; tu += 1) {
        const terrain = lastTile[tv * TILE_SIZE + tu];
        if (TERRAIN_PRIORITY[terrain] > TERRAIN_PRIORITY[best]) best = terrain;
      }
    }
    return best;
  };

  // Working out which tile cell lies under a screen cell takes a handful of
  // trig calls, and there are thousands of cells in every frame. Close in,
  // the answer varies so smoothly across the grid that it only needs working
  // out at every PATCH-th cell each way, and reading off in between.
  const PATCH = 8;
  const nodesAcross = Math.ceil(cols / PATCH) + 1;
  const nodesDown = Math.ceil(rows / PATCH) + 1;
  const nodes = detail ? new Float64Array(nodesAcross * nodesDown * 2) : null;
  if (nodes) {
    for (let j = 0; j < nodesDown; j += 1) {
      for (let i = 0; i < nodesAcross; i += 1) {
        const at = unproject(scene, i * PATCH + 0.5, j * PATCH + 0.5);
        const ok = at && Math.abs(at.latitude) < TILE_LAT_LIMIT;
        const [xt, yt] = ok ? tileXY(at.latitude, at.longitude, tilesAcross) : [NaN, NaN];
        nodes[(j * nodesAcross + i) * 2] = xt;
        nodes[(j * nodesAcross + i) * 2 + 1] = yt;
      }
    }
  }
  // The terrain under cell (c, r) read off its patch, or -2 if the patch
  // cannot be trusted: off the globe, near a pole, or across the date line.
  const terrainByPatch = (c, r) => {
    const i = Math.floor(c / PATCH);
    const j = Math.floor(r / PATCH);
    const a = (j * nodesAcross + i) * 2;
    const b = a + nodesAcross * 2;
    const x00 = nodes[a];
    const x10 = nodes[a + 2];
    const x01 = nodes[b];
    const x11 = nodes[b + 2];
    // NaN fails every comparison, so one test covers bad corners and wraps.
    if (!(Math.abs(x10 - x00) < 1 && Math.abs(x01 - x00) < 1 && Math.abs(x11 - x00) < 1)) return -2;
    const fx = (c - i * PATCH) / PATCH;
    const fy = (r - j * PATCH) / PATCH;
    const top = x00 + (x10 - x00) * fx;
    const xt = top + (x01 + (x11 - x01) * fx - top) * fy;
    const y0 = nodes[a + 1] + (nodes[a + 3] - nodes[a + 1]) * fx;
    const yt = y0 + (nodes[b + 1] + (nodes[b + 3] - nodes[b + 1]) * fx - y0) * fy;
    return terrainAt(xt, yt);
  };

  const out = new Array(rows);
  for (let r = 0; r < rows; r += 1) {
    const dy = r + 0.5 - cy;
    let line = '';
    if (dy * dy <= outer) {
      let runStart = 0;
      let runColour = -1;
      for (let c = 0; c <= cols; c += 1) {
        let colour = -1;
        if (c < cols) {
          const dx = c + 0.5 - cx;
          const d2 = dx * dx + dy * dy;
          const patched = d2 <= inner && nodes ? terrainByPatch(c, r) : -2;
          if (patched >= 0) {
            colour = TERRAIN_SLOT[patched];
          } else if (d2 <= inner) {
            const nx = dx / radius;
            const ny = -dy / radius;
            const nz = Math.sqrt(1 - nx * nx - ny * ny);
            const lat = Math.asin(clamp(ny * cosPhi0 + nz * sinPhi0, -1, 1)) / RAD;
            const lon = wrapLongitude(
              scene.lon + Math.atan2(nx, nz * cosPhi0 - ny * sinPhi0) / RAD
            );
            // No tile for this cell came back from its patch (-1), or the
            // patch was no use (-2) and the cell has to be looked up itself.
            let terrain = -1;
            if (patched === -2 && detail && lat < TILE_LAT_LIMIT && lat > -TILE_LAT_LIMIT) {
              const [xt, yt] = tileXY(lat, lon, tilesAcross);
              terrain = terrainAt(xt, yt);
            }
            if (terrain >= 0) {
              colour = TERRAIN_SLOT[terrain];
            } else {
              const cell = landCellIndex(lat, lon);
              const isLand = mask[cell] === 1 || (extraLand ? extraLand.has(cell) : false);

              // Lit from the upper left, in three hard bands.
              const light = 0.5 + (-0.45 * nx + 0.55 * ny + 0.7 * nz - 0.5) * shading;
              let tone = light > 0.72 ? 0 : light > 0.3 ? 1 : 2;

              let base;
              if (isLand) base = lat > 72 || lat < -62 ? ICE : LAND;
              else base = lat > 84 ? ICE : OCEAN;

              if (
                specks &&
                speckle(Math.floor(lon / lattice), Math.floor(lat / lattice), level) < 3
              ) {
                // Darker flecks on land, lighter glints on water.
                tone = base === OCEAN ? Math.max(0, tone - 1) : Math.min(2, tone + 1);
              }
              colour = base + tone;
            }
          } else if (d2 <= outer) {
            colour = OUTLINE;
          }
        }
        if (colour !== runColour) {
          if (runColour !== -1) {
            line += `${line ? ',' : ''}${runStart}:${c - runStart}:${runColour}`;
          }
          runStart = c;
          runColour = colour;
        }
      }
    }
    out[r] = line;
  }
  return out;
}

/**
 * The colour that covers most of the painted grid. Drawn as one backdrop, it
 * saves a rectangle for every run of it.
 */
export function commonestColour(lines) {
  const cells = [];
  lines.forEach((line) => {
    if (!line) return;
    line.split(',').forEach((run) => {
      const [, length, colour] = run.split(':');
      cells[colour] = (cells[colour] || 0) + Number(length);
    });
  });
  let best = -1;
  cells.forEach((count, colour) => {
    if (best < 0 || count > cells[best]) best = colour;
  });
  return best;
}

/**
 * Merge painted rows into as few rectangles as possible: a run that sits
 * exactly under the same run in the row above joins it. Returns them flat,
 * five numbers each - column, row, width, height, colour - because a street
 * map is thousands of runs and every rectangle is a View to draw. Runs of
 * `backdrop`, if given, are left out.
 */
export function meshRows(lines, backdrop = -1) {
  const skip = `:${backdrop}`;
  const rects = [];
  let above = new Map(); // run -> where its rectangle starts in `rects`
  lines.forEach((line, row) => {
    const here = new Map();
    if (line) {
      line.split(',').forEach((run) => {
        if (run.endsWith(skip)) return;
        let at = above.get(run);
        if (at === undefined) {
          const [start, length, colour] = run.split(':');
          at = rects.length;
          rects.push(Number(start), row, Number(length), 1, Number(colour));
        } else {
          rects[at + 3] += 1;
        }
        here.set(run, at);
      });
    }
    above = here;
  });
  return rects;
}

/** Great-circle distance in kilometres. */
export function distanceKm(a, b) {
  const dLat = (b.latitude - a.latitude) * RAD;
  const dLon = (b.longitude - a.longitude) * RAD;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.latitude * RAD) * Math.cos(b.latitude * RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Where the globe should fly when it opens: the newest located photo, zoomed
 * in further the more photos sit close around it. Returns null when nothing
 * has a location. `points` are newest first.
 *
 * The zoom fits the "typical" distance to the nearest few neighbours, counting
 * each missing neighbour as NEARBY_KM away. So a lone photo gets a regional
 * view, and every photo added nearby - the nearer the more - moves the camera
 * closer, until a well-trodden neighbourhood fills the screen.
 */
export function focusOnLatest(points) {
  if (!points.length) return null;
  const [latest, ...others] = points;
  const nearby = others
    .map((p) => distanceKm(latest, p))
    .filter((km) => km <= NEARBY_KM)
    .sort((a, b) => a - b)
    .slice(0, FOCUS_NEIGHBOURS);

  let logSum = 0;
  for (let i = 0; i < FOCUS_NEIGHBOURS; i += 1) {
    logSum += Math.log(Math.max(CLOSEST_KM, i < nearby.length ? nearby[i] : NEARBY_KM));
  }
  const spreadKm = Math.exp(logSum / FOCUS_NEIGHBOURS);
  const zoom = clamp(FOCUS_FILL / (spreadKm / EARTH_RADIUS_KM), MIN_ZOOM, MAX_ZOOM);

  return {
    latitude: latest.latitude,
    longitude: latest.longitude,
    zoom,
    nearbyCount: nearby.length,
  };
}

/**
 * Group the points that would overlap on screen. Each cluster sits where its
 * newest member is, so it does not slide about as the globe turns, and is
 * keyed by that member. `spacing` is in cells; points off the grid or behind
 * the globe are dropped. `points` are newest first.
 */
export function clusterPoints(points, scene, cols, rows, spacing) {
  const clusters = [];
  const reach = spacing * spacing;
  points.forEach((point) => {
    const at = project(scene, point.latitude, point.longitude);
    if (!at || at.x < 0 || at.x > cols || at.y < 0 || at.y > rows) return;
    const home = clusters.find((c) => (c.x - at.x) ** 2 + (c.y - at.y) ** 2 <= reach);
    if (home) home.items.push(point.sticker);
    else clusters.push({ id: point.id, x: at.x, y: at.y, items: [point.sticker] });
  });
  return clusters;
}

/** The name most of a cluster's photos share, or null if none has one. */
export function placeName(stickers) {
  const counts = {};
  let best = null;
  stickers.forEach((s) => {
    const place = s.location?.place;
    if (!place) return;
    counts[place] = (counts[place] || 0) + 1;
    if (!best || counts[place] > counts[best]) best = place;
  });
  return best;
}
