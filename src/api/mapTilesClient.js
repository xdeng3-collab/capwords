/**
 * The HTTP side of the globe's close-up detail: vector map tiles from
 * OpenFreeMap (OpenStreetMap data in the OpenMapTiles schema). Free and
 * keyless, but the terms ask for attribution wherever the map is shown - see
 * MAP_ATTRIBUTION.
 *
 * What a tile means and how it is drawn live in utils/tileRaster.js; when to
 * fetch one lives in services/mapService.js.
 */

const TILESET_URL = 'https://tiles.openfreemap.org/planet';
const TIMEOUT_MS = 15000;

export const MAP_ATTRIBUTION = '© OpenFreeMap · OpenMapTiles · OpenStreetMap';

// The tile URL carries the dataset's build date, so it has to be looked up.
let template = null;

async function tileTemplate() {
  if (template) return template;
  const response = await fetch(TILESET_URL);
  if (!response.ok) throw new Error(`Tileset lookup failed (${response.status})`);
  const [url] = (await response.json()).tiles || [];
  if (!url) throw new Error('Tileset lists no tile URL');
  template = url;
  return template;
}

// XMLHttpRequest rather than fetch: React Native's fetch cannot hand back
// binary (its Blob has no arrayBuffer()), XHR can.
function getBytes(url) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('GET', url);
    request.responseType = 'arraybuffer';
    request.timeout = TIMEOUT_MS;
    request.onload = () => {
      if (request.status === 200 && request.response) resolve(request.response);
      else reject(new Error(`Tile request failed (${request.status})`));
    };
    request.onerror = () => reject(new Error('Tile request failed (network)'));
    request.ontimeout = () => reject(new Error('Tile request timed out'));
    request.send();
  });
}

/** One tile's bytes (protobuf). Throws when offline or the tile is missing. */
export async function fetchMapTile(z, x, y) {
  const url = (await tileTemplate())
    .replace('{z}', z)
    .replace('{x}', x)
    .replace('{y}', y);
  return getBytes(url);
}
