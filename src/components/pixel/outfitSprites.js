/**
 * Outfit overlays for PetSprite (ids match config OUTFITS). Each outfit is a
 * list of parts, because a halo and a pair of wings do not fit in one grid.
 *
 * `x` is a column in the buddy's 18-wide grid; `y` is relative to the blob's
 * top row (ears occupy negative space), so outfits sit correctly on every
 * species regardless of ear height. Parts may poke outside the grid.
 *
 * The widget draws the same outfits from targets/widget/PixelPet.swift.
 */
export const OUTFIT_SPRITES = {
  bow: [
    {
      x: 6,
      y: -2,
      grid: ['rr..rr', 'rrkkrr', 'rr..rr'],
      palette: { r: '#D96C6C', k: '#B54A4A' },
    },
  ],
  scarf: [
    {
      x: 3,
      y: 5,
      grid: ['cccccccccccc', '.........cc.', '........cc..'],
      palette: { c: '#D96C6C' },
    },
  ],
  crown: [
    {
      x: 6,
      y: -2,
      grid: ['g.gg.g', 'gggggg'],
      palette: { g: '#F2C14E' },
    },
  ],

  // ---- Battle rewards ----
  headband: [
    {
      x: 1,
      y: 1,
      grid: [
        'rrrrrrsssrrrrrrrr..',
        'kkkkkksksskkkkkk.rr',
        '.................rr',
        '..................r',
      ],
      palette: { r: '#D94A4A', k: '#A63232', s: '#C9D1D9' },
    },
  ],
  viking: [
    {
      x: 0,
      y: -4,
      grid: [
        'h................h',
        'hh..oooooooooo..hh',
        '.hhosswsssssssohh.',
        '..hossssssssssoh..',
        '..odgddgddgddgdo..',
      ],
      palette: {
        o: '#3A2A1A',
        h: '#F4E8C8',
        s: '#9AA7B5',
        w: '#D5DDE5',
        d: '#5E6B7A',
        g: '#F2C14E',
      },
    },
  ],
  halo: [
    {
      x: 5,
      y: -6,
      grid: ['.gggggg.', 'gy....yg', '.gggggg.'],
      palette: { g: '#F2C14E', y: '#FBE7A8' },
    },
    {
      x: -3,
      y: 2,
      grid: ['.ww.', 'wwww', 'wsww', '.ss.'],
      palette: { w: '#FFFFFF', s: '#D8E6F2' },
    },
    {
      x: 17,
      y: 2,
      grid: ['.ww.', 'wwww', 'wwsw', '.ss.'],
      palette: { w: '#FFFFFF', s: '#D8E6F2' },
    },
  ],

  // ---- Premium ----
  wizard: [
    {
      x: 2,
      y: -6,
      grid: [
        '......pq......',
        '.....pppq.....',
        '.....pspq.....',
        '....pppppq....',
        '...pppppspq...',
        '...gggggggg...',
        'pppppppppppppq',
      ],
      palette: { p: '#7B4FC9', q: '#55329A', s: '#FBE7A8', g: '#F2C14E' },
    },
    // A spark of magic drifting beside the hat.
    {
      x: 16,
      y: -4,
      grid: ['.s.', 'sws', '.s.'],
      palette: { s: '#F7A8F0', w: '#FFFFFF' },
    },
  ],
  cyber: [
    {
      x: 1,
      y: 2,
      grid: ['dwcccccddwcccccd', 'dccccccddccccccd'],
      palette: { d: '#1B2238', c: '#3DF0FF', w: '#FFFFFF' },
    },
    {
      x: 8,
      y: -3,
      grid: ['mm', 'dd', 'dd'],
      palette: { m: '#FF4FD8', d: '#1B2238' },
    },
    {
      x: 0,
      y: 2,
      grid: ['m', 'm'],
      palette: { m: '#FF4FD8' },
    },
    {
      x: 17,
      y: 2,
      grid: ['m', 'm'],
      palette: { m: '#FF4FD8' },
    },
  ],
  knight: [
    {
      x: 2,
      y: -5,
      grid: [
        '.......rr.....',
        '.....rrrrr....',
        '....rrRrrr....',
        '...ssssssss...',
        '..sswsssssss..',
        'ssssssssssssss',
        'dggggggggggggd',
      ],
      palette: { r: '#D94A4A', R: '#F08A80', s: '#B8C2CC', w: '#EEF3F7', d: '#7C8794', g: '#F2C14E' },
    },
  ],
};
