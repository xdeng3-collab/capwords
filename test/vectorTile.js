/* eslint-env jest */
import Pbf from 'pbf';

/**
 * Builds a vector map tile (the Mapbox Vector Tile wire format) for tests, so
 * they need neither the network nor a binary fixture.
 *
 *   buildVectorTile({
 *     water: [{ type: 'polygon', class: 'lake', rings: [[[0, 0], [4096, 0], ...]] }],
 *     transportation: [{ type: 'line', class: 'minor', rings: [[[0, 100], [4096, 100]]] }],
 *   })
 *
 * Coordinates are in tile units, 0 to 4096, x east and y south.
 */
const TYPES = { point: 1, line: 2, polygon: 3 };
const zigzag = (n) => (n << 1) ^ (n >> 31);

function geometry(feature) {
  const out = [];
  let cx = 0;
  let cy = 0;
  feature.rings.forEach((ring) => {
    ring.forEach(([x, y], i) => {
      if (i === 0) out.push((1 << 3) | 1); // MoveTo, once
      if (i === 1) out.push(((ring.length - 1) << 3) | 2); // LineTo, the rest
      out.push(zigzag(x - cx), zigzag(y - cy));
      cx = x;
      cy = y;
    });
    if (feature.type === 'polygon') out.push((1 << 3) | 7); // ClosePath
  });
  return out;
}

export function buildVectorTile(layers) {
  const pbf = new Pbf();
  Object.entries(layers).forEach(([name, features]) => {
    pbf.writeMessage(3, (_, layer) => {
      const values = [...new Set(features.map((f) => f.class).filter(Boolean))];
      layer.writeVarintField(15, 2);
      layer.writeStringField(1, name);
      features.forEach((feature) => {
        layer.writeMessage(2, (__, out) => {
          if (feature.class) out.writePackedVarint(2, [0, values.indexOf(feature.class)]);
          out.writeVarintField(3, TYPES[feature.type]);
          out.writePackedVarint(4, geometry(feature));
        });
      });
      layer.writeStringField(3, 'class');
      values.forEach((value) => layer.writeMessage(4, (__, out) => out.writeStringField(1, value)));
      layer.writeVarintField(5, 4096);
    });
  });
  return pbf.finish();
}
