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
TERRAIN_SLOT[TERRAIN.ICE] = ICE + 1;
TERRAIN_SLOT[TERRAIN.SAND] = SAND;
TERRAIN_SLOT[TERRAIN.BUILDING] = BUILDING;
TERRAIN_SLOT[TERRAIN.ROAD] = ROAD;
TERRAIN_SLOT[TERRAIN.STREET] = STREET;

// Cheap integer hash to [0, 100), for the specks that give flat sea and land
// some texture - and make it visible that the globe is turning.
function speckle(i, j) {
  let h = (Math.imul(i, 73856093) ^ Math.imul(j, 19349663)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return h % 100;
}
// Specks sit on a lattice in map space, this many degrees across.
const SPECK_DEGREES = 2;

function isLandAt(mask, extraLand, lat, lon) {
  const cell = landCellIndex(lat, lon);
  return mask[cell] === 1 || (extraLand ? extraLand.has(cell) : false);
}

/**
 * Paint the globe, seen as a ball, onto a `cols` x `rows` grid. Returns one
 * string per row: runs of same-coloured cells as "start:length:colour" joined
 * by commas, with empty space left out.
 *
 * `extraLand` is a Set of land-mask cells to treat as land whatever the map
 * says - the mask is too coarse to know a harbour city from open sea.
 */
export function paintGlobe(scene, cols, rows, extraLand) {
  const mask = landMask();
  const { radius, cx, cy } = scene;
  const phi0 = scene.lat * RAD;
  const sinPhi0 = Math.sin(phi0);
  const cosPhi0 = Math.cos(phi0);
  // Seen whole, the globe is shaded as a ball. Closer, that shading would
  // just be a diagonal stripe across the view, so `scene.shading` fades it
  // out - and the specks with it.
  const shading = scene.shading ?? 1;
  const outer = (radius + 1) * (radius + 1);
  const inner = radius * radius;

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
          if (d2 <= inner) {
            const nx = dx / radius;
            const ny = -dy / radius;
            const nz = Math.sqrt(1 - nx * nx - ny * ny);
            const lat = Math.asin(clamp(ny * cosPhi0 + nz * sinPhi0, -1, 1)) / RAD;
            const lon = wrapLongitude(
              scene.lon + Math.atan2(nx, nz * cosPhi0 - ny * sinPhi0) / RAD
            );

            // Lit from the upper left, in three hard bands.
            const light = 0.5 + (-0.45 * nx + 0.55 * ny + 0.7 * nz - 0.5) * shading;
            let tone = light > 0.72 ? 0 : light > 0.3 ? 1 : 2;

            let base;
            if (isLandAt(mask, extraLand, lat, lon)) base = lat > 72 || lat < -62 ? ICE : LAND;
            else base = lat > 84 ? ICE : OCEAN;

            if (
              shading > 0 &&
              speckle(Math.floor(lon / SPECK_DEGREES), Math.floor(lat / SPECK_DEGREES)) < 3
            ) {
              // Darker flecks on land, lighter glints on water.
              tone = base === OCEAN ? Math.max(0, tone - 1) : Math.min(2, tone + 1);
            }
            colour = base + tone;
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

/*
 * Close in, the globe stops being a ball.
 *
 * It is drawn as a flat map at fixed levels, like any map app: at level L one
 * screen cell is exactly one cell of a zoom-L map tile, everywhere on screen.
 * A level is then one fixed picture. Dragging slides it, pinching stretches
 * it, and nothing about it depends on where the view happens to be - unlike a
 * ball, where the same river is squeezed differently at the edge of the
 * screen than in the middle, and so changes as it is dragged across.
 *
 * Map tiles are Web Mercator, so that is the flat map. A position on it is
 * counted in the level's cells: east from 180 W, south from about 85 N.
 */

// Mercator runs out towards the poles.
const TILE_LAT_LIMIT = 85;
// Levels start where tiles are worth having - below that the built-in land
// mask is as good and the tiles are at their heaviest - and run one past the
// deepest tiles, where each tile cell is drawn two screen cells across.
export const MIN_LEVEL = 4;
export const MAX_LEVEL = TILE_MAX_ZOOM + 1;
// A tile that has not arrived is drawn from a coarser one covering the same
// ground, up to this many levels up. Far enough that the overview fetched
// first on the way in stands in for everything below it.
const TILE_FALLBACK_LEVELS = 6;

const cellsAround = (level) => TILE_SIZE * 2 ** level;
const tileStretch = (lat) => Math.cos(clamp(lat, -TILE_LAT_LIMIT, TILE_LAT_LIMIT) * RAD);

/** A coordinate's position on the flat map at `level`, in cells: [east, south]. */
function levelXY(latitude, longitude, level) {
  const around = cellsAround(level);
  const sin = Math.sin(clamp(latitude, -TILE_LAT_LIMIT, TILE_LAT_LIMIT) * RAD);
  return [
    ((wrapLongitude(longitude) + 180) / 360) * around,
    (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * around,
  ];
}
const latitudeAt = (y, around) => Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / around))) / RAD;

/** The level, fractional, that a globe of this radius (in cells) is at. */
export function levelFor(radius, lat) {
  return Math.log2((radius * 360 * tileStretch(lat)) / (TILE_SIZE * 57.2958));
}

/**
 * The radius, in cells, at which the globe is exactly at `level`: where the
 * ball, at the middle of the screen, is the same size as the flat map.
 */
export function levelRadius(level, lat) {
  return (cellsAround(level) * 57.2958) / (360 * tileStretch(lat));
}

/**
 * The scene as it is drawn at `level`: moved by less than a cell so that its
 * cells sit squarely on the map's, and sized to the level exactly.
 */
export function snapScene(scene, level) {
  const around = cellsAround(level);
  const [u, v] = levelXY(scene.lat, scene.lon, level);
  const x = Math.round(u - scene.cx) + scene.cx;
  const y = Math.round(v - scene.cy) + scene.cy;
  const lat = latitudeAt(y, around);
  return { ...scene, lon: (x / around) * 360 - 180, lat, radius: levelRadius(level, lat) };
}

/**
 * Where the view ends up after the map at `level` (which may be fractional)
 * is dragged `dx` cells right and `dy` cells down under it: { lat, lon }.
 * Exact on the flat map, so the point under the finger stays under it.
 */
export function dragOnLevel(level, lat, lon, dx, dy) {
  const around = cellsAround(level);
  const [u, v] = levelXY(lat, lon, level);
  return {
    lat: clamp(latitudeAt(v - dy, around), -TILE_LAT_LIMIT, TILE_LAT_LIMIT),
    lon: wrapLongitude(((u - dx) / around) * 360 - 180),
  };
}

/**
 * Where a coordinate lands on the grid of a scene drawn at `level`. Always
 * somewhere - a flat map has no far side - though possibly far off the grid.
 */
export function projectLevel(scene, level, latitude, longitude) {
  const around = cellsAround(level);
  const [u0, v0] = levelXY(scene.lat, scene.lon, level);
  const [u, v] = levelXY(latitude, longitude, level);
  // The short way round the world.
  const dx = ((((u - u0 + around / 2) % around) + around) % around) - around / 2;
  return { x: scene.cx + dx, y: scene.cy + (v - v0) };
}

/**
 * The tiles a scene drawn at `level` is looking at, nearest the middle
 * first: [{ z, x, y }]. Past the deepest tiles, those are what is drawn.
 */
export function levelTiles(scene, level, cols, rows) {
  const z = Math.min(level, TILE_MAX_ZOOM);
  const perTile = TILE_SIZE * 2 ** (level - z); // screen cells across one tile
  const across = 2 ** z;
  const [u0, v0] = levelXY(scene.lat, scene.lon, level);
  const left = Math.floor((u0 - scene.cx) / perTile);
  const right = Math.floor((u0 - scene.cx + cols - 1) / perTile);
  const top = Math.max(0, Math.floor((v0 - scene.cy) / perTile));
  const bottom = Math.min(across - 1, Math.floor((v0 - scene.cy + rows - 1) / perTile));
  const tiles = [];
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      const distance = ((x + 0.5) * perTile - u0) ** 2 + ((y + 0.5) * perTile - v0) ** 2;
      tiles.push({ z, x: ((x % across) + across) % across, y, distance });
    }
  }
  return tiles.sort((a, b) => a.distance - b.distance).map(({ x, y }) => ({ z, x, y }));
}

/**
 * Paint a scene drawn at `level` (see snapScene) onto a `cols` x `rows` grid,
 * as rows of runs like paintGlobe. `tile(z, x, y)` hands back a map tile if
 * it has one to hand; where it has neither that tile nor a coarser one over
 * the same ground, the cell falls back to the land mask.
 */
export function paintLevel(scene, level, cols, rows, extraLand, tile) {
  const mask = landMask();
  const around = cellsAround(level);
  const z = Math.min(level, TILE_MAX_ZOOM);
  const perTile = TILE_SIZE * 2 ** (level - z);
  const across = 2 ** z;
  const [u0, v0] = levelXY(scene.lat, scene.lon, level);
  const left = Math.round(u0 - scene.cx); // the map cell under grid column 0
  const top = Math.round(v0 - scene.cy);

  // The mask needs real coordinates, but only one per column and per row.
  const longitudes = new Float64Array(cols);
  for (let c = 0; c < cols; c += 1) {
    longitudes[c] = wrapLongitude(((left + c + 0.5) / around) * 360 - 180);
  }

  // Neighbouring cells nearly always share a tile, so remember the last one.
  let lastX = NaN;
  let lastY = NaN;
  let raster = null;
  let levelsUp = 0;

  const out = new Array(rows);
  for (let r = 0; r < rows; r += 1) {
    const v = top + r;
    let line = '';
    if (v >= 0 && v < around) {
      const lat = latitudeAt(v + 0.5, around);
      const ty = Math.floor(v / perTile);
      let runStart = 0;
      let runColour = -1;
      for (let c = 0; c <= cols; c += 1) {
        let colour = -1;
        if (c < cols) {
          const u = (((left + c) % around) + around) % around;
          const tx = Math.floor(u / perTile);
          if (tx !== lastX || ty !== lastY) {
            lastX = tx;
            lastY = ty;
            raster = null;
            for (let up = 0; up <= TILE_FALLBACK_LEVELS && up <= z && !raster; up += 1) {
              raster = tile(z - up, tx >> up, ty >> up) || null;
              levelsUp = up;
            }
          }
          if (raster) {
            // This cell's place in that tile, which may be a coarser one.
            const span = perTile * 2 ** levelsUp;
            const x = Math.floor(((u % span) / span) * TILE_SIZE);
            const y = Math.floor(((v % span) / span) * TILE_SIZE);
            colour = TERRAIN_SLOT[raster[y * TILE_SIZE + x]];
          } else if (isLandAt(mask, extraLand, lat, longitudes[c])) {
            colour = (lat > 72 || lat < -62 ? ICE : LAND) + 1;
          } else {
            colour = (lat > 84 ? ICE : OCEAN) + 1;
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
 * the globe are dropped. `points` are newest first. Pass `level` for a scene
 * drawn flat at that level.
 */
export function clusterPoints(points, scene, cols, rows, spacing, level = null) {
  const clusters = [];
  const reach = spacing * spacing;
  points.forEach((point) => {
    const at =
      level == null
        ? project(scene, point.latitude, point.longitude)
        : projectLevel(scene, level, point.latitude, point.longitude);
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
