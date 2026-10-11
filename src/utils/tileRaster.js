import Pbf from 'pbf';
import { VectorTile } from '@mapbox/vector-tile';

/**
 * Turns a vector map tile (OpenMapTiles schema, the usual web-map z/x/y
 * pyramid) into pixel art: a TILE_SIZE x TILE_SIZE grid with one terrain
 * class per cell. Pure - bytes in, grid out.
 *
 * Only what reads at this size is kept: water, woods and grass, ice and sand,
 * buildings, and roads in two weights. Labels, boundaries, footpaths and the
 * rest of the tile are dropped.
 */

export const TILE_SIZE = 128;
/** The deepest zoom the tile pyramid goes to. */
export const TILE_MAX_ZOOM = 14;

export const TERRAIN = {
  LAND: 0,
  WATER: 1,
  WOOD: 2,
  GRASS: 3,
  ICE: 4,
  SAND: 5,
  BUILDING: 6,
  ROAD: 7, // motorways and main roads
  STREET: 8, // everything smaller that cars use
};

const LANDCOVER = {
  wood: TERRAIN.WOOD,
  grass: TERRAIN.GRASS,
  ice: TERRAIN.ICE,
  sand: TERRAIN.SAND,
};
const ROADS = {
  motorway: TERRAIN.ROAD,
  trunk: TERRAIN.ROAD,
  primary: TERRAIN.ROAD,
  secondary: TERRAIN.STREET,
  tertiary: TERRAIN.STREET,
  minor: TERRAIN.STREET,
};
// Seen from too far away a road network is just scribble over the map, so
// each kind of road only appears from the zoom where there is room for it.
const ROAD_FROM_ZOOM = {
  motorway: 6,
  trunk: 11,
  primary: 12,
  secondary: 13,
  tertiary: 13,
  minor: 14,
};

/** Even-odd fill of a polygon's rings, sampled at cell centres. */
function fillPolygon(grid, rings, scale, value) {
  const crossings = [];
  rings.forEach((ring) => {
    for (let i = 0; i < ring.length - 1; i += 1) {
      const x1 = ring[i].x * scale;
      const y1 = ring[i].y * scale;
      const x2 = ring[i + 1].x * scale;
      const y2 = ring[i + 1].y * scale;
      if (y1 === y2) continue;
      const top = Math.min(y1, y2);
      const bottom = Math.max(y1, y2);
      // Rows whose centre (row + 0.5) lies in [top, bottom).
      const first = Math.max(0, Math.ceil(top - 0.5));
      const last = Math.min(TILE_SIZE - 1, Math.ceil(bottom - 0.5) - 1);
      for (let row = first; row <= last; row += 1) {
        const x = x1 + ((row + 0.5 - y1) / (y2 - y1)) * (x2 - x1);
        (crossings[row] = crossings[row] || []).push(x);
      }
    }
  });
  crossings.forEach((xs, row) => {
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      // Columns whose centre lies in [xs[i], xs[i + 1]).
      const from = Math.max(0, Math.ceil(xs[i] - 0.5));
      const to = Math.min(TILE_SIZE - 1, Math.ceil(xs[i + 1] - 0.5) - 1);
      if (to >= from) grid.fill(value, row * TILE_SIZE + from, row * TILE_SIZE + to + 1);
    }
  });
}

/** One-cell-wide lines. */
function drawLines(grid, lines, scale, value) {
  lines.forEach((line) => {
    for (let i = 0; i < line.length - 1; i += 1) {
      const x1 = line[i].x * scale;
      const y1 = line[i].y * scale;
      const dx = line[i + 1].x * scale - x1;
      const dy = line[i + 1].y * scale - y1;
      const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))));
      for (let s = 0; s <= steps; s += 1) {
        const x = Math.floor(x1 + (dx * s) / steps);
        const y = Math.floor(y1 + (dy * s) / steps);
        if (x >= 0 && x < TILE_SIZE && y >= 0 && y < TILE_SIZE) grid[y * TILE_SIZE + x] = value;
      }
    }
  });
}

function eachFeature(layer, visit) {
  if (!layer) return;
  for (let i = 0; i < layer.length; i += 1) visit(layer.feature(i));
}

const POLYGON = 3;
const LINE = 2;

/**
 * Rasterise one tile. `bytes` is the tile as served (an ArrayBuffer or
 * Uint8Array of protobuf) and `z` its zoom level; the result is row-major,
 * north-west first. Throws if the bytes are not a vector tile.
 */
export function rasterizeTile(bytes, z) {
  const { layers } = new VectorTile(new Pbf(bytes));
  const grid = new Uint8Array(TILE_SIZE * TILE_SIZE); // all TERRAIN.LAND

  // Painted back to front: ground cover, water over it, then what is built.
  eachFeature(layers.landcover, (feature) => {
    const value = LANDCOVER[feature.properties.class];
    if (value === undefined || feature.type !== POLYGON) return;
    fillPolygon(grid, feature.loadGeometry(), TILE_SIZE / feature.extent, value);
  });
  eachFeature(layers.water, (feature) => {
    if (feature.type !== POLYGON) return;
    fillPolygon(grid, feature.loadGeometry(), TILE_SIZE / feature.extent, TERRAIN.WATER);
  });
  eachFeature(layers.waterway, (feature) => {
    if (feature.type !== LINE || feature.properties.class !== 'river') return;
    drawLines(grid, feature.loadGeometry(), TILE_SIZE / feature.extent, TERRAIN.WATER);
  });
  eachFeature(layers.building, (feature) => {
    if (feature.type !== POLYGON) return;
    fillPolygon(grid, feature.loadGeometry(), TILE_SIZE / feature.extent, TERRAIN.BUILDING);
  });

  // Streets first so main roads stay unbroken where they cross.
  [TERRAIN.STREET, TERRAIN.ROAD].forEach((weight) => {
    eachFeature(layers.transportation, (feature) => {
      const road = feature.properties.class;
      if (feature.type !== LINE || ROADS[road] !== weight) return;
      if (feature.properties.brunnel === 'tunnel') return;
      if (z < ROAD_FROM_ZOOM[road]) return;
      drawLines(grid, feature.loadGeometry(), TILE_SIZE / feature.extent, weight);
    });
  });

  return grid;
}

/**
 * Which tile a coordinate falls in at zoom `z`, as fractional tile
 * coordinates: the integer part names the tile, the fraction is the position
 * inside it. Web Mercator, so only meaningful between about 85 degrees north
 * and south.
 */
export function tileCoordinates(latitude, longitude, z) {
  const n = 2 ** z;
  const sin = Math.sin((latitude * Math.PI) / 180);
  return {
    x: ((longitude + 180) / 360) * n,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * n,
  };
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Bytes to base64, for keeping a raster in a file. */
export function bytesToBase64(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    out += B64[a >> 2] + B64[((a & 3) << 4) | (b >> 4)];
    out += i + 1 < bytes.length ? B64[((b & 15) << 2) | (c >> 6)] : '=';
    out += i + 2 < bytes.length ? B64[c & 63] : '=';
  }
  return out;
}

export function base64ToBytes(text) {
  const clean = text.replace(/=+$/, '');
  const bytes = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let buffer = 0;
  let bits = 0;
  let at = 0;
  for (let i = 0; i < clean.length; i += 1) {
    buffer = (buffer << 6) | B64.indexOf(clean[i]);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes[at] = (buffer >> bits) & 255;
      at += 1;
    }
  }
  return bytes;
}
