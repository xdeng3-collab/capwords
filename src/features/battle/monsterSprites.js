/**
 * Pixel art for Poop Battle's monsters (ids match config MONSTERS / BOSSES).
 * Plain data - grids of colour keys, drawn by PixelSprite.
 *
 * Every monster paints its body with the same three keys (b = body, h =
 * highlight, d = shade), so a later lap through the roster can reuse the grid
 * in a tier's colours.
 */

const SHARED = {
  o: '#3A2A1A', // outline
  w: '#FFFFFF', // eye white
  k: '#2E2018', // pupil / brow
  m: '#5A1F2B', // mouth
  t: '#FFF8E7', // teeth
  r: '#D94A4A', // red accents
  y: '#F2C14E', // horns, glowing eyes
  s: '#F4E8C8', // mushroom stem
};

const MONSTER_ART = {
  slime: {
    body: { b: '#7CC47A', h: '#C4EBB8', d: '#4E9A55' },
    grid: [
      '......oooo......',
      '....oobbbboo....',
      '...obhhbbbbbo...',
      '..obhbbbbbbbbo..',
      '.obbbbbbbbbbbbo.',
      '.obbwwbbbbwwbbo.',
      'obbbwkbbbbwkbbbo',
      'obbbbbbbbbbbbbbo',
      'obbbbmttttmbbbbo',
      'obdbbbmmmmbbbdbo',
      '.oddbbbbbbbbddo.',
      '..oooooooooooo..',
    ],
  },
  bat: {
    body: { b: '#8C7BC0', h: '#B9ADE0', d: '#5F4F96' },
    grid: [
      '.......o....o.......',
      '......obo..obo......',
      '.oo...obbbbbbo...oo.',
      'obbo.obbhbbbbbo.obbo',
      'obbbbbbwkbbwkbbbbbbo',
      'obbbbbbbbbbbbbbbbbbo',
      'obdbbbbbtmmtbbbbbdbo',
      'odo.obdbbbbbbdbo.odo',
      '.o...oo.obbo.oo...o.',
      '.........oo.........',
    ],
  },
  shroom: {
    body: { b: '#D96C6C', h: '#F2A7A0', d: '#A8474B' },
    grid: [
      '.....oooooo.....',
      '...oobhhbbboo...',
      '..obbwwbbbbbbo..',
      '.obbbwwbbbwwbbo.',
      '.obbbbbbbbwwbbo.',
      'obbwbbbbbbbbbbbo',
      'obbbbbbbbbbwbbbo',
      'oddddddddddddddo',
      '.oooooooooooooo.',
      '....okssssko....',
      '....osksskso....',
      '....ossmmsso....',
      '....osssssso....',
      '.....oooooo.....',
    ],
  },
  ghost: {
    body: { b: '#EDE7F6', h: '#FFFFFF', d: '#C9BEE0' },
    grid: [
      '....oooooo....',
      '..oobbbbbboo..',
      '.obhhbbbbbbbo.',
      '.obhbbbbbbbbo.',
      'obbbkkbbkkbbbo',
      'obbbkkbbkkbbbo',
      'obbbbbbbbbbbbo',
      'obbbbbmmbbbbbo',
      'obbbbbmmbbbbbo',
      'obbbbbbbbbbbbo',
      'obdbbbbdbbbbdo',
      'obbo.obbo.obbo',
      '.oo...oo...oo.',
    ],
  },
  ogre: {
    body: { b: '#8DBF5A', h: '#C5E39A', d: '#5E8F3A' },
    grid: [
      '..oo..........oo..',
      '.oyyo........oyyo.',
      '..oyobbbbbbbboyo..',
      '..oobbhhbbbbbboo..',
      '.obbbhbbbbbbbbbbo.',
      '.obkkkbbbbbbkkkbo.',
      '.obbwkbbbbbbwkbbo.',
      'obbbbbbbddbbbbbbbo',
      'obbbbbbbddbbbbbbbo',
      'obbtmmmmmmmmmmtbbo',
      'obbtmttmmmmttmtbbo',
      'obbbmmmmmmmmmmbbbo',
      '.obbbbbbbbbbbbbbo.',
      '.obdbbbbbbbbbbdbo.',
      '..oddbbbbbbbbddo..',
      '...oooooooooooo...',
    ],
  },
  dragon: {
    body: { b: '#E0764A', h: '#F7B58C', d: '#A84A2C' },
    grid: [
      '...o............o...',
      '..oyo..........oyo..',
      '..oyyo.oooooo.oyyo..',
      '...oyoobbbbbbooyo...',
      '....obbbhhbbbbbo....',
      '...obbbhbbbbbbbbo...',
      'oo.obykbbbbbbykbo.oo',
      'obo.obbbbbbbbbbo.obo',
      'obbo.obbbbbbbbo.obbo',
      'obbbobbbkbbkbbbobbbo',
      'obdbobbbbbbbbbbobdbo',
      'odo.otmtmtmtmtmo.odo',
      '.o..orrrrrrrrrro..o.',
      '....obbrrrrrrbbo....',
      '.....obbbbbbbbo.....',
      '......oooooooo......',
    ],
  },
  demon: {
    body: { b: '#7A56A8', h: '#B193D6', d: '#4E3475' },
    grid: [
      'o................o',
      'oo..............oo',
      'oro....oooo....oro',
      'orro.oobbbboo.orro',
      '.orrobbhhbbbborro.',
      '..oobbhbbbbbbboo..',
      '..obkkbbbbbbkkbo..',
      '.obbyykbbbbkyybbo.',
      '.obbbbbbbbbbbbbbo.',
      'obbtbbbbbbbbbbtbbo',
      'obbmtmtmtmtmtmmbbo',
      'obbmmrrrrrrrrmmbbo',
      '.obbmmmmmmmmmmbbo.',
      '.obdbbbbbbbbbbdbo.',
      '..oddbbbbbbbbddo..',
      '...oooooooooooo...',
    ],
  },
};

// Body colours for each lap through the roster (config MONSTER_TIERS). The
// first lap wears the monster's own.
const TIER_BODIES = [
  null,
  { b: '#D9534F', h: '#F2A29B', d: '#9E3531' }, // Angry
  { b: '#8FD3E8', h: '#E3F6FB', d: '#4F9DBA' }, // Frozen
  { b: '#4A4063', h: '#8478A6', d: '#2B2440' }, // Shadow
  { b: '#F2C14E', h: '#FBE7A8', d: '#B8860B' }, // Golden
];

/** { grid, palette } for a monster id in a tier's colours. */
export function monsterSprite(id, tier = 0) {
  const art = MONSTER_ART[id] || MONSTER_ART.slime;
  const body = TIER_BODIES[tier] || art.body;
  return { grid: art.grid, palette: { ...SHARED, ...body } };
}
