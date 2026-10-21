/**
 * The sea map's look: which waters the buddy sails through as islands pile
 * up, and the pixel grids that draw them. Like every sprite in the app these
 * are bitmaps of colour keys ('.' is transparent), rendered by PixelSprite.
 */

// ==================== Zones ====================
// `from` is the first island index of each zone. The further you go the rarer
// a new zone gets, so there is always a next sight to look forward to.

export const SEA_ZONES = [
  {
    key: 'cove',
    name: 'Coconut Cove',
    from: 0,
    water: '#5CC8D7',
    wave: '#C4F1F6',
    banner: '#2FA6BC',
    ground: { t: '#F6D98E', T: '#E8C46F', s: '#D9A95B', S: '#B98545' },
    prop: 'palm',
    decos: ['fish', 'buoy', 'fish2'],
  },
  {
    key: 'reef',
    name: 'Coral Reef',
    from: 7,
    water: '#3FA7D6',
    wave: '#B8E4F6',
    banner: '#2A82B8',
    ground: { t: '#F8E6BC', T: '#EBCF95', s: '#E09E96', S: '#B8706E' },
    prop: 'coral',
    decos: ['boat', 'turtle', 'fish'],
  },
  {
    key: 'sunset',
    name: 'Sunset Isles',
    from: 14,
    water: '#EE9A78',
    wave: '#FFD9BE',
    banner: '#D8683F',
    ground: { t: '#94C96A', T: '#76AE52', s: '#A0704C', S: '#7A5236' },
    prop: 'lighthouse',
    decos: ['gull', 'boat', 'gull2'],
  },
  {
    key: 'glacier',
    name: 'Glacier Bay',
    from: 30,
    water: '#4877B0',
    wave: '#D4E9F9',
    banner: '#2E5C96',
    ground: { t: '#F4FAFF', T: '#DCEEFA', s: '#A6D4EE', S: '#78B3D8' },
    prop: 'pine',
    decos: ['iceberg', 'penguin', 'floe'],
  },
  {
    key: 'volcano',
    name: 'Volcano Ridge',
    from: 60,
    water: '#2F6068',
    wave: '#86BBB4',
    banner: '#B9472E',
    ground: { t: '#7D6C66', T: '#68584F', s: '#4F3F3C', S: '#382B2A' },
    prop: 'volcano',
    decos: ['rock', 'fish', 'rock'],
  },
  {
    key: 'aurora',
    name: 'Aurora Sea',
    from: 100,
    water: '#1E2A55',
    wave: '#6C7BD9',
    banner: '#5B4BB5',
    ground: { t: '#D8CBF8', T: '#BFAFEE', s: '#8A74D1', S: '#634FAF' },
    prop: 'crystal',
    decos: ['whale', 'moon', 'stars'],
  },
];

export function zoneIndexOf(island) {
  let z = 0;
  SEA_ZONES.forEach((zone, i) => {
    if (island >= zone.from) z = i;
  });
  return z;
}

export function zoneOf(island) {
  return SEA_ZONES[zoneIndexOf(island)];
}

// ==================== Islands ====================
// A floating chunk of land, seen slightly from above like a Jump Jump tile:
// t/T the top surface, s/S the cliff, f the surf.

export const ISLAND_GRID = [
  '......tttttttt......',
  '...tttttttttttttt...',
  '.tttttttttttttttttt.',
  'TttttttttttttttttttT',
  '.TTttttttttttttttTT.',
  '.ssssssssssssssssss.',
  '..ssssssssssssssss..',
  '...SssssssssssssS...',
  '.ff.SSSSSSSSSSSS.ff.',
  '...ffff......ffff...',
];

/** Rows down from the top of ISLAND_GRID where the buddy's feet rest. */
export const ISLAND_STAND_ROW = 2;

const OUTLINE = '#3A2A1A';
const SURF = '#FFFFFF';

// Island palettes per zone, built once so PixelSprite's memo holds.
export const ISLAND_PALETTES = Object.fromEntries(
  SEA_ZONES.map((z) => [z.key, { ...z.ground, f: SURF }])
);

// ==================== Props that grow on islands ====================

export const PROPS = {
  palm: {
    grid: [
      '..L....L..',
      '.LlL..LlL.',
      'LlllLLlllL',
      'l.lllllll.',
      '...lccl...',
      '....ct....',
      '....t.....',
      '....t.....',
      '...t......',
      '...t......',
      '..ttt.....',
    ],
    palette: { l: '#5FB04E', L: '#3E8A3A', t: '#9B6B3C', c: '#6B4423' },
  },
  coral: {
    grid: [
      '.p..p....',
      '.p.pp..o.',
      'pp.p..oo.',
      '.ppp.o.o.',
      '..p..oo..',
      '..pp.o.w.',
      '.pppooowW',
    ],
    palette: { p: '#F27C9E', o: '#FF9F45', w: '#FFF4E0', W: '#E8C8A8' },
  },
  lighthouse: {
    grid: [
      '..dd..',
      '.dyyd.',
      '.dyyd.',
      'dddddd',
      '.rrrr.',
      '.wwww.',
      '.rrrr.',
      '.wwww.',
      'rrrrrr',
      'wwwwww',
      'rrrrrr',
    ],
    palette: { d: '#4A3826', y: '#FFE27A', r: '#D9534F', w: '#FFFFFF' },
  },
  pine: {
    grid: [
      '....n....',
      '...nnn...',
      '...gGg...',
      '..nnnnn..',
      '..gGgGg..',
      '.nnnnnnn.',
      '.gGgggGg.',
      'nnnnnnnnn',
      'gGgGgGgGg',
      '....t....',
      '....t....',
    ],
    palette: { n: '#FFFFFF', g: '#3F8F6B', G: '#2B6B50', t: '#7A5236' },
  },
  volcano: {
    grid: [
      '...m...m....',
      '....mm.m....',
      '.....mm.....',
      '....vooR....',
      '...RroovR...',
      '..RrrrorrR..',
      '.RrrrrrvrrR.',
      'RrrrrrrrrrrR',
    ],
    palette: { m: '#C9C1BC', v: '#E8452C', o: '#FF9F2E', r: '#6E5A55', R: '#4A3A37' },
  },
  crystal: {
    grid: [
      '..k......',
      '.kwK.....',
      '.kwK..k..',
      '.kwK.kwK.',
      'kkwKkkwKK',
      'kkkKkkkKK',
      '.kkKKKKK.',
    ],
    palette: { k: '#9FE8F2', w: '#FFFFFF', K: '#4FB6D8' },
  },
};

// The start dock's flag, and the pennant planted on every island already won.
export const FLAG = {
  grid: ['prrr', 'prrr', 'prr.', 'p...', 'p...', 'p...'],
  palette: { p: OUTLINE, r: '#E8574B' },
};

// ==================== Things floating in the sea ====================

export const DECOS = {
  fish: {
    grid: ['...ooo.', 'o.ooooe', 'ooooooo', 'o..ooo.'],
    palette: { o: '#FF9F45', e: OUTLINE },
  },
  fish2: {
    grid: ['..yyy..', 'y.yyyyk', 'yyyyyyy', 'y..yyy.'],
    palette: { y: '#FFD84D', k: OUTLINE },
  },
  buoy: {
    grid: ['..r..', '.rwr.', '.rrr.', '.www.', 'fffff'],
    palette: { r: '#E8574B', w: '#FFFFFF', f: SURF },
  },
  boat: {
    grid: [
      '....w....',
      '....ww...',
      '....www..',
      '....wwww.',
      '....t....',
      'rrrrrrrrr',
      '.rrrrrrr.',
      '..fffff..',
    ],
    palette: { w: '#FFFFFF', t: '#7A5236', r: '#C0583A', f: SURF },
  },
  turtle: {
    grid: ['..gGg...', '.gGgGg.h', 'gGgGgGhh', '.g...g..'],
    palette: { g: '#4E9F5A', G: '#2E6E3E', h: '#8FCB6B' },
  },
  gull: {
    grid: ['ww...ww', '..w.w..', '...w...'],
    palette: { w: '#FFFFFF' },
  },
  gull2: {
    grid: ['w...w', '.w.w.', '..w..'],
    palette: { w: '#FFFFFF' },
  },
  iceberg: {
    grid: [
      '....nn....',
      '...nnni...',
      '..nnnniI..',
      '.nnnniiiI.',
      'nnnnniiiII',
      'ffffffffff',
      '.IIIIIIII.',
      '...IIII...',
    ],
    palette: { n: '#FFFFFF', i: '#CDE8F7', I: '#8DC3E3', f: SURF },
  },
  floe: {
    grid: ['..nnnnn..', '.nnnnniii', 'fffffffff'],
    palette: { n: '#FFFFFF', i: '#CDE8F7', f: SURF },
  },
  penguin: {
    grid: ['.kkk.', 'kwkwk', 'kwwwk', 'kwowk', 'kwwwk', '.kwk.', 'nooon', 'nnnnn'],
    palette: { k: '#25303F', w: '#FFFFFF', o: '#FFA43A', n: '#EAF6FD' },
  },
  rock: {
    grid: ['..m..', '.m.m.', '..m..', '.RRR.', 'RrrrR', 'fffff'],
    palette: { m: '#D8D2CE', R: '#3A2D2B', r: '#5B4A47', f: '#9AD1C8' },
  },
  whale: {
    grid: [
      '..s.s.......',
      '...s........',
      '.bbbbbb...bb',
      'bbebbbbbbbb.',
      'bbbbbbbbbbb.',
      '.wwwwbbb....',
    ],
    palette: { s: '#BFE6FF', b: '#5C6FC9', e: '#FFFFFF', w: '#B9C3F0' },
  },
  moon: {
    grid: ['.yyy..', 'yyy...', 'yy....', 'yy....', 'yyy...', '.yyy..'],
    palette: { y: '#FFE9A0' },
  },
  stars: {
    grid: ['.y......', 'yyy...y.', '.y......', '....y...', '...yyy..', '....y...'],
    palette: { y: '#FFF3B0' },
  },
};

// A little wave crest, tinted per zone.
export const WAVE_GRID = ['.ww..ww.', 'w..ww..w'];
