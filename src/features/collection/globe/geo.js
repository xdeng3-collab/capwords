import { LAND_COLS, LAND_ROWS, landMask } from './landMask';

/**
 * The geometry behind the Book's globe. Pure: no React, no storage.
 *
 * The globe is an orthographic projection - the Earth seen from far away -
 * painted one square cell at a time. A `scene` says where it sits on the cell
 * grid: { lon, lat } is the point facing the viewer (degrees), `radius` the
 * globe's radius in cells, and { cx, cy } its centre in cells.
 * `shading` (0 to 1, default 1) is how strongly it is lit as a ball.
 *
 * Only the far view is drawn. Close in, the system map takes over (see
 * GlobeView and RealMap), and the conversions at the end of this file line
 * the two up.
 */

const RAD = Math.PI / 180;
const EARTH_RADIUS_KM = 6371;

// Zoom is the globe's size: 1 fills the screen. Opening it flies in as far as
// MAX_ZOOM - a few streets across - most of that on the system map.
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 20000;

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

// Colour slots: the outline, then ocean, land and ice in three tones each
// (lit, mid, shaded). See GLOBE_COLORS.
const OUTLINE = 0;
const OCEAN = 1;
const LAND = 4;
const ICE = 7;

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
 * Close in, the globe hands over to the system map (Apple Maps), which
 * speaks in regions - a centre and how many degrees the view spans. These
 * line a region up with the globe at the middle of the screen, where the
 * ball and the flat map agree, so one can fade into the other.
 */

// The flat map (Web Mercator) runs out towards the poles.
const LAT_LIMIT = 85;
const cosLat = (lat) => Math.cos(clamp(lat, -LAT_LIMIT, LAT_LIMIT) * RAD);

/**
 * The region the system map should show to match a globe of `radius` cells
 * (each `cellPt` points) centred on lat/lon, on a widthPt x heightPt screen.
 */
export function regionForGlobe(lat, lon, radius, widthPt, heightPt, cellPt) {
  // At the middle of the ball one radian is `radius` cells; across, each
  // degree of longitude is shortened by the latitude, as on the flat map.
  const degreesPerPt = 57.2958 / (radius * cellPt);
  return {
    latitude: clamp(lat, -LAT_LIMIT, LAT_LIMIT),
    longitude: wrapLongitude(lon),
    latitudeDelta: Math.min(170, heightPt * degreesPerPt),
    longitudeDelta: Math.min(360, (widthPt * degreesPerPt) / cosLat(lat)),
  };
}

/** The radius, in cells, of the globe that matches a region: the inverse of regionForGlobe. */
export function globeRadiusForRegion(region, widthPt, cellPt) {
  return (widthPt * 57.2958) / (region.longitudeDelta * cosLat(region.latitude) * cellPt);
}

const mercatorY = (lat) => {
  const sin = Math.sin(clamp(lat, -LAT_LIMIT, LAT_LIMIT) * RAD);
  return Math.log((1 + sin) / (1 - sin)) / 2;
};

/**
 * Group the points that would overlap on a system map showing `region` on a
 * widthPt x heightPt screen, `spacingPt` apart, the way clusterPoints does for
 * the drawn globe: each cluster sits on its newest member and is keyed by it.
 * Returns [{ id, latitude, longitude, items }]; points off screen are dropped.
 */
export function clusterOnRegion(points, region, widthPt, heightPt, spacingPt) {
  const top = mercatorY(region.latitude + region.latitudeDelta / 2);
  const bottom = mercatorY(region.latitude - region.latitudeDelta / 2);
  const reach = spacingPt * spacingPt;
  const clusters = [];
  points.forEach((point) => {
    const east = wrapLongitude(point.longitude - region.longitude);
    const x = (east / region.longitudeDelta + 0.5) * widthPt;
    const y = ((top - mercatorY(point.latitude)) / (top - bottom)) * heightPt;
    if (x < 0 || x > widthPt || y < 0 || y > heightPt) return;
    const home = clusters.find((c) => (c.x - x) ** 2 + (c.y - y) ** 2 <= reach);
    if (home) home.items.push(point.sticker);
    else {
      clusters.push({
        id: point.id,
        latitude: point.latitude,
        longitude: point.longitude,
        x,
        y,
        items: [point.sticker],
      });
    }
  });
  return clusters;
}

/**
 * Merge painted rows into as few rectangles as possible: a run that sits
 * exactly under the same run in the row above joins it. Returns them flat,
 * five numbers each - column, row, width, height, colour - since every
 * rectangle is a View to draw.
 */
export function meshRows(lines) {
  const rects = [];
  let above = new Map(); // run -> where its rectangle starts in `rects`
  lines.forEach((line, row) => {
    const here = new Map();
    if (line) {
      line.split(',').forEach((run) => {
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
