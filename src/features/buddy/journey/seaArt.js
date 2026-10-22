/**
 * The journey map's look: which places the buddy hops through as islands pile
 * up, and the pixel grids that draw them. Like every sprite in the app these
 * are bitmaps of colour keys ('.' is transparent), rendered by PixelSprite.
 */
import { DESTINATIONS } from '../../../config';

// ==================== Zones ====================
// One zone per place in DESTINATIONS (config/journey.js), which says where it
// starts and what to tell people about it. This is how each one looks: the
// "water" is whatever the islands float over - sea, sand, lawn or cloud.
// `surf` tints the spray under each island (white unless set).

const ZONE_ART = {
  cove: {
    water: '#5CC8D7',
    wave: '#C4F1F6',
    banner: '#2FA6BC',
    ground: { t: '#F6D98E', T: '#E8C46F', s: '#D9A95B', S: '#B98545' },
    prop: 'palm',
    decos: ['fish', 'buoy', 'fish2'],
  },
  reef: {
    water: '#3FA7D6',
    wave: '#B8E4F6',
    banner: '#2A82B8',
    ground: { t: '#F8E6BC', T: '#EBCF95', s: '#E09E96', S: '#B8706E' },
    prop: 'coral',
    decos: ['turtle', 'fish', 'boat'],
  },
  santorini: {
    water: '#2E7FC1',
    wave: '#BFE3F7',
    banner: '#1F5F9E',
    ground: { t: '#F7F3EA', T: '#E6DFD0', s: '#8C6A5A', S: '#6B4C40' },
    prop: 'dome',
    decos: ['boat', 'gull', 'gull2'],
  },
  amazon: {
    water: '#4E7F5E',
    wave: '#8FCB8A',
    banner: '#2E7D32',
    ground: { t: '#8BD16A', T: '#6FB855', s: '#8A5A3A', S: '#6B4423' },
    surf: '#A6E3A0',
    prop: 'kapok',
    decos: ['parrot', 'lily', 'butterfly'],
  },
  sahara: {
    water: '#E9C27A',
    wave: '#F6DDA6',
    banner: '#C98A3B',
    ground: { t: '#D9A066', T: '#C48A50', s: '#A86B3C', S: '#82502A' },
    surf: '#F6DDA6',
    prop: 'camel',
    decos: ['dune', 'cactus', 'dune'],
  },
  giza: {
    water: '#F0CF8A',
    wave: '#FBE6B8',
    banner: '#B8873C',
    ground: { t: '#D8B07A', T: '#C49A62', s: '#9C7448', S: '#7A5838' },
    surf: '#FBE6B8',
    prop: 'pyramid',
    decos: ['camelSmall', 'dune', 'sun'],
  },
  taj: {
    water: '#5FA8A0',
    wave: '#C8EDE6',
    banner: '#3E8A82',
    ground: { t: '#D98C6A', T: '#C4735A', s: '#A85A44', S: '#7F4232' },
    prop: 'taj',
    decos: ['lotus', 'lotus', 'gull2'],
  },
  greatwall: {
    water: '#7FAF6A',
    wave: '#B9DDA2',
    banner: '#7A6A55',
    ground: { t: '#9CCB7A', T: '#7FB05E', s: '#8E7F6E', S: '#6B5E50' },
    surf: '#DCEFD0',
    prop: 'wall',
    decos: ['cloud', 'lantern', 'gull2'],
  },
  fuji: {
    water: '#7FB7E0',
    wave: '#E3F2FB',
    banner: '#D9534F',
    ground: { t: '#F7C6D6', T: '#EAA6BE', s: '#8A6A55', S: '#6B4E40' },
    prop: 'fuji',
    decos: ['torii', 'blossom', 'boat'],
  },
  kilauea: {
    water: '#2F6068',
    wave: '#86BBB4',
    banner: '#B9472E',
    ground: { t: '#7D6C66', T: '#68584F', s: '#4F3F3C', S: '#382B2A' },
    prop: 'volcano',
    decos: ['rock', 'fish', 'rock'],
  },
  forbidden: {
    water: '#5F8FA8',
    wave: '#CFE3EC',
    banner: '#B8322A',
    ground: { t: '#E8E2D6', T: '#D4CCBC', s: '#B8322A', S: '#8E2A1F' },
    prop: 'palace',
    decos: ['lantern', 'lotus', 'cloud'],
  },
  galapagos: {
    water: '#2FA3B5',
    wave: '#BDEFF2',
    banner: '#1E7F8E',
    ground: { t: '#6E6A5E', T: '#5A564C', s: '#4A463E', S: '#35322C' },
    prop: 'tortoise',
    decos: ['iguana', 'fish', 'gull'],
  },
  machu: {
    water: '#A9C8E6',
    wave: '#FFFFFF',
    banner: '#5E8C3A',
    ground: { t: '#7FBF5E', T: '#62A148', s: '#A89A86', S: '#7F7262' },
    prop: 'machu',
    decos: ['cloud', 'llama', 'condor'],
  },
  canyon: {
    water: '#3F8FA0',
    wave: '#B5E0E8',
    banner: '#B5502F',
    ground: { t: '#E8935A', T: '#D47A45', s: '#B5502F', S: '#8C3A22' },
    prop: 'mesa',
    decos: ['condor', 'cactus', 'balloon'],
  },
  whitehouse: {
    water: '#7CB86A',
    wave: '#B8E0A0',
    banner: '#2F4E8C',
    ground: { t: '#9BD07E', T: '#7FB866', s: '#B7AFA0', S: '#8E877A' },
    surf: '#DDF0CF',
    prop: 'whitehouse',
    decos: ['blossom', 'cloud', 'blossom'],
  },
  eiffel: {
    water: '#7FA6C9',
    wave: '#DCEAF6',
    banner: '#3B5BA5',
    ground: { t: '#9CCB7A', T: '#7FB05E', s: '#C9B79A', S: '#A8957A' },
    prop: 'eiffel',
    decos: ['balloon', 'cloud', 'boat'],
  },
  venice: {
    water: '#3C9C9A',
    wave: '#BFEAE4',
    banner: '#B5502F',
    ground: { t: '#E8C9A0', T: '#D4B086', s: '#C8553D', S: '#9C3D2B' },
    prop: 'campanile',
    decos: ['gondola', 'gull', 'gondola'],
  },
  glacier: {
    water: '#4877B0',
    wave: '#D4E9F9',
    banner: '#2E5C96',
    ground: { t: '#F4FAFF', T: '#DCEEFA', s: '#A6D4EE', S: '#78B3D8' },
    prop: 'pine',
    decos: ['iceberg', 'whale', 'floe'],
  },
  antarctica: {
    water: '#1F3D63',
    wave: '#E2F1FB',
    banner: '#2A6FA8',
    ground: { t: '#FFFFFF', T: '#E4F2FB', s: '#BBDDF2', S: '#86BEE0' },
    prop: 'emperor',
    decos: ['penguin', 'iceberg', 'floe'],
  },
  aurora: {
    water: '#1E2A55',
    wave: '#6C7BD9',
    banner: '#5B4BB5',
    ground: { t: '#EAF2FF', T: '#C9D6F0', s: '#5E5A6E', S: '#433F52' },
    prop: 'turfhouse',
    decos: ['ribbon', 'moon', 'stars'],
  },
};

/** Every place, in journey order, with its look: DESTINATIONS + ZONE_ART. */
export const ZONES = DESTINATIONS.filter((d) => ZONE_ART[d.key]).map((d) => ({
  ...d,
  ...ZONE_ART[d.key],
}));

export function zoneIndexOf(island) {
  let z = 0;
  ZONES.forEach((zone, i) => {
    if (island >= zone.from) z = i;
  });
  return z;
}

export function zoneOf(island) {
  return ZONES[zoneIndexOf(island)];
}

/** Places with no art yet; a test keeps this empty. */
export function zonesMissingArt() {
  return DESTINATIONS.filter((d) => !ZONE_ART[d.key]).map((d) => d.key);
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
  ZONES.map((z) => [z.key, { ...z.ground, f: z.surf || SURF }])
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
  dome: {
    grid: [
      '.....c......',
      '....bbbb....',
      '...bbbbbb...',
      '..bbbbbbbb..',
      '..wwwwwwwg..',
      '.wwwwwwwwwg.',
      '.wwkwwwwkwg.',
      '.wwkwwwwkwg.',
      '.wwwwwwwwwg.',
      '.wwwwddwwwg.',
      '.wwwwddwwwg.',
    ],
    palette: { c: '#FFFFFF', b: '#2F6FC1', w: '#FFFFFF', g: '#D9E2EA', k: '#2F6FC1', d: '#3E78C8' },
  },
  kapok: {
    grid: [
      '...LLLLLL...',
      '.LLllllllLL.',
      'LllhllllhllL',
      'LllllllllllL',
      '.LLllllllLL.',
      '...LLttLL...',
      '.....tt.....',
      '..v..tt.....',
      '..v..tt..v..',
      '..v.ttt..v..',
      '....tttt....',
    ],
    palette: { L: '#2E7D32', l: '#4CAF50', h: '#81C784', t: '#7A5236', v: '#3E8A3A' },
  },
  camel: {
    grid: [
      '...cc..........',
      '..cccc.....ccc.',
      '.crrrcc...ccecc',
      '.ccccccc..cc...',
      'cccccccccccc...',
      'Ccccccccccc....',
      '.cccccccccc....',
      '.c.c....c.c....',
      '.c.c....c.c....',
      '.C.C....C.C....',
    ],
    palette: { c: '#D9A55B', C: '#A9743A', r: '#C0392B', e: '#3A2A1A' },
  },
  pyramid: {
    grid: [
      '.......y.......',
      '......yyY......',
      '.....yyyYY.....',
      '....yyyyYYY....',
      '...yybyyYYYY...',
      '..yyyyyyYYYYY..',
      '.yyyybyyYYYYYY.',
      'yybyyyyyYYYYYYY',
    ],
    palette: { y: '#F6DFA0', Y: '#D9A955', b: '#C99A48' },
  },
  taj: {
    grid: [
      '.......g.......',
      '......www......',
      '.m...wwwww...m.',
      'mmm.wwwwwww.mmm',
      '.m..wwwwwww..m.',
      '.m...wwwww...m.',
      '.m.wwwwwwwww.m.',
      '.m.wwwwwwwww.m.',
      '.m.wwwkkkwww.m.',
      '.m.wkwkkkwkw.m.',
      '.m.wkwkkkwkw.m.',
      'sssssssssssssss',
    ],
    palette: { g: '#E8B84A', w: '#FFFFFF', m: '#F2EEE6', k: '#9DB7D6', s: '#D9CBB0' },
  },
  wall: {
    grid: [
      '........b.b.b',
      '........bbbbb',
      '........bkbkb',
      'b.b.b.b.bbbbb',
      'bbbbbbbbbbbbb',
      'BbBbBbBbBbBbB',
      'bbbbbbbbbbbbb',
      'BbBbBbBbBbBbB',
    ],
    palette: { b: '#C2B39A', B: '#8E7F6E', k: '#3A2A1A' },
  },
  fuji: {
    grid: [
      '.....nnnn.....',
      '....nnnnnn....',
      '...nnnnnnnn...',
      '..nnmnnmnnMn..',
      '..mmmmmmmmMM..',
      '.mmmmmmmmmMMM.',
      '.mmmmmmmmMMMM.',
      'mmmmmmmmmMMMMM',
    ],
    palette: { n: '#FFFFFF', m: '#5B6FB5', M: '#3F4F8F' },
  },
  palace: {
    grid: [
      '.......y.......',
      'y.yyyyyyyyyyy.y',
      '.yyyyyyyyyyyyy.',
      'yYYYYYYYYYYYYYy',
      '..rRrRrRrRrRr..',
      '..rrrrrrrrrrr..',
      '..rRrdddddrRr..',
      '..rRrdddddrRr..',
      '.wwwwwwwwwwwww.',
      'wwwwwwwwwwwwwww',
    ],
    palette: { y: '#F2C14E', Y: '#C9932E', r: '#C0392B', R: '#8E2A1F', d: '#7A1F16', w: '#F4F1EA' },
  },
  tortoise: {
    grid: [
      '....SSSSS.....',
      '..SSsSsSsSS...',
      '.SsSsSsSsSsS..',
      '.SSSSSSSSSSShh',
      '.kkkkkkkkkkkhe',
      '.kk.kk..kk.kk.',
    ],
    palette: { S: '#5E5A3A', s: '#8A845A', k: '#7C8C6A', h: '#7C8C6A', e: '#3A2A1A' },
  },
  machu: {
    grid: [
      '....g..........',
      '...ggg.........',
      '...gGgg........',
      '..gggGgg.......',
      '..ggggGgg......',
      '.gggggggGg.....',
      '.ggggggggGgg...',
      'ggggggggggGggg.',
      'shhs.shhs.sssss',
      'swws.swws.ttttt',
      'sssssssssssssss',
      'ttttttttttttttt',
    ],
    palette: { g: '#4E9A4E', G: '#2F6E3A', s: '#A89A86', h: '#C9A24E', w: '#5B4A3A', t: '#6FAF55' },
  },
  mesa: {
    grid: [
      '...rrrrrr......',
      '..rRRRRRRr.....',
      '..oooooooo.....',
      '.rrrrrrrrrr..rr',
      '.oooooooooo.ooo',
      'rrrrrrrrrrrrrrr',
      'RRRRRRRRRRRRRRR',
      'ooooooooooooooo',
    ],
    palette: { r: '#C8553D', R: '#9C3D2B', o: '#E8935A' },
  },
  whitehouse: {
    grid: [
      '.....wwwww.....',
      '....wwwwwww....',
      'gggwwwwwwwwwggg',
      'wwwwwwwwwwwwwww',
      'wkwkwcwcwcwkwkw',
      'wkwkwcwcwcwkwkw',
      'wwwwwcwcwcwwwww',
      'wkwkwcwdwcwkwkw',
      'wkwkwcwdwcwkwkw',
      'sssssssssssssss',
    ],
    palette: { w: '#FFFFFF', g: '#C9CED6', k: '#4A5A73', c: '#D5DAE2', d: '#4A3826', s: '#B7C4B0' },
  },
  eiffel: {
    grid: [
      '.....e.....',
      '.....e.....',
      '....eEe....',
      '....eEe....',
      '....eEe....',
      '...eeeee...',
      '...eEeEe...',
      '...e.E.e...',
      '..eeeeeee..',
      '..eE...Ee..',
      '..e.....e..',
      '.eeeeeeeee.',
      '.eE.....Ee.',
      'eE.......Ee',
      'e.........e',
    ],
    palette: { e: '#7A5A3A', E: '#A97F55' },
  },
  campanile: {
    grid: [
      '...g...',
      '..ggg..',
      '.ggggg.',
      '.wwwww.',
      '.wkkkw.',
      '.wwwww.',
      '.rrrrr.',
      '.rRrRr.',
      '.rrrrr.',
      '.rRrRr.',
      '.rrrrr.',
      '.rRrRr.',
      'wwwwwww',
    ],
    palette: { g: '#5BA88C', w: '#F4EDE0', k: '#3A2A1A', r: '#C8553D', R: '#A2402E' },
  },
  emperor: {
    grid: [
      '..kkk...',
      '.kkekk..',
      '.kkkkoo.',
      '.ykkkk..',
      'kywwwkk.',
      'kwwwwwk.',
      'kwwwwwk.',
      'kwwwwwk.',
      '.kwwwk..',
      '.oo.oo..',
    ],
    palette: { k: '#25303F', e: '#FFFFFF', o: '#FFA43A', y: '#FFC94A', w: '#FFFFFF' },
  },
  turfhouse: {
    grid: [
      '....gggg....',
      '...gGGGGg...',
      '..gGGwwGGg..',
      '.gGGwwwwGGg.',
      'gGGwwwwwwGGg',
      '.ssswyywsss.',
      '.ssswddwsss.',
      '.ssswddwsss.',
    ],
    palette: { g: '#6BAF5A', G: '#4E8A45', w: '#FFFFFF', y: '#FFE27A', d: '#8C2F2F', s: '#8A8A80' },
  },
};

// The start dock's flag, and the pennant planted on every island already won.
export const FLAG = {
  grid: ['prrr', 'prrr', 'prr.', 'p...', 'p...', 'p...'],
  palette: { p: OUTLINE, r: '#E8574B' },
};

// Milestone islands (see JOURNEY) fly a golden pennant under a floating star.
export const MILESTONE_FLAG = {
  grid: FLAG.grid,
  palette: { p: OUTLINE, r: '#F2C14E' },
};

export const STAR = {
  grid: ['...y...', '..yyy..', 'yyyWyyy', '.yyyyy.', '.yy.yy.', 'y.....y'],
  palette: { y: '#FFD84D', W: '#FFFFFF' },
};

// The milestone halo over the buddy's head, and the glints around it.
export const HALO = {
  grid: ['...yyyyyy...', '.yy......yy.', '.YY......YY.', '...YYYYYY...'],
  palette: { y: '#FFE27A', Y: '#F2B43A' },
};

export const SPARKLE = {
  grid: ['.w.', 'wyw', '.w.'],
  palette: { w: '#FFFFFF', y: '#FFE27A' },
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
  parrot: {
    grid: ['..rr.', '.rrek', '.rrr.', '.ryr.', '.bbr.', '..b..'],
    palette: { r: '#E8452C', e: '#FFFFFF', k: '#3A2A1A', y: '#FFD84D', b: '#2F7FD0' },
  },
  lily: {
    grid: ['..p..', '.pPp.', 'ggggg', '.ggg.'],
    palette: { p: '#F7A8C8', P: '#FFFFFF', g: '#7CC46B' },
  },
  butterfly: {
    grid: ['bb.bb', 'bbkbb', '.bkb.', 'b...b'],
    palette: { b: '#3FA7F0', k: '#25303F' },
  },
  dune: {
    grid: ['...yy...', '.yyyyyy.', 'yyyyyyyy'],
    palette: { y: '#F6DDA6' },
  },
  cactus: {
    grid: ['..g...', 'g.g...', 'g.g.g.', 'ggg.g.', '..ggg.', '..g...'],
    palette: { g: '#4E9A4E' },
  },
  camelSmall: {
    grid: ['..cc.....', '.cccc..ce', 'cccccccc.', '.cccccc..', '.c.c.c.c.'],
    palette: { c: '#C99050', e: '#3A2A1A' },
  },
  sun: {
    grid: ['y.y.y', '.yyy.', 'yyyyy', '.yyy.', 'y.y.y'],
    palette: { y: '#FFE27A' },
  },
  lotus: {
    grid: ['.p.p.', 'ppPpp', '.ppp.', 'ggggg'],
    palette: { p: '#F7A8C8', P: '#FFFFFF', g: '#5BA88C' },
  },
  cloud: {
    grid: ['..www..', '.wwwwww', 'wwwwwww'],
    palette: { w: '#FFFFFF' },
  },
  lantern: {
    grid: ['..k..', '.rrr.', 'rryrr', 'rrrrr', '.rrr.', '..y..'],
    palette: { r: '#D9342B', y: '#F2C14E', k: '#3A2A1A' },
  },
  blossom: {
    grid: ['.pp..p', 'pPpp..', '.pp..p', '...p..'],
    palette: { p: '#F7B6CE', P: '#FFFFFF' },
  },
  torii: {
    grid: ['rrrrrrr', '.r...r.', 'rrrrrrr', '.r...r.', '.r...r.'],
    palette: { r: '#D9342B' },
  },
  iguana: {
    grid: ['....kkk.', '.kkkkkek', 'kkkkkk..', 'k.k..k..'],
    palette: { k: '#3E3A36', e: '#FF8A3A' },
  },
  llama: {
    grid: ['.....ww', '.....we', '.....ww', 'wwwwwww', 'wwwwww.', 'w.w.w.w'],
    palette: { w: '#F4EDE0', e: '#3A2A1A' },
  },
  condor: {
    grid: ['k.....k', 'kk...kk', '.kkwkk.', '...k...'],
    palette: { k: '#2E2A2A', w: '#FFFFFF' },
  },
  balloon: {
    grid: ['.rrr.', 'rryrr', 'rrrrr', '.rrr.', '..k..', '.kkk.'],
    palette: { r: '#E8574B', y: '#FFD84D', k: '#7A5236' },
  },
  gondola: {
    grid: ['....r......', '....k.....k', 'k...k....k.', '.kkkkkkkkk.', '..ffffff...'],
    palette: { r: '#E8574B', k: '#25303F', f: SURF },
  },
  ribbon: {
    grid: ['g...g...', '.g.g.g.g', '..g...g.'],
    palette: { g: '#6BF0A8' },
  },
};

// A little wave crest, tinted per zone.
export const WAVE_GRID = ['.ww..ww.', 'w..ww..w'];
