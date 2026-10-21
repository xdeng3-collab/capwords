/**
 * Full-colour pixel glyphs for the Snap screen's controls. They borrow the
 * shapes people already know from the phone's own camera - a little landscape
 * photo for the library, swapping arrows for flip - so they read at a glance.
 */

const O = '#3A2A1A';

export const PHOTOS_ICON = {
  grid: [
    '...OOOOOOOOOO',
    '...OwwwwwwwwO',
    'OOOOOOOOOOOwO',
    'OsssssssyysOO',
    'OsssssssyysO.',
    'OssssssssssO.',
    'OsssGssssssO.',
    'OssGgGsssGsO.',
    'OsGgggGsGgGO.',
    'OGgggggGgggO.',
    'OOOOOOOOOOOO.',
  ],
  palette: { O, w: '#FBF3E0', s: '#8FC6E8', y: '#F2C14E', G: '#4E7B45', g: '#7CB06A' },
};

// Two arrows passing each other: swap to the other camera.
export const FLIP_ICON = {
  grid: [
    '........c....',
    '........cc...',
    '.ccccccccccc.',
    '.ccccccccccc.',
    '........cc...',
    '....c...c....',
    '...cc........',
    '.ccccccccccc.',
    '.ccccccccccc.',
    '...cc........',
    '....c........',
  ],
  palette: { c: '#FBF3E0' },
};

// A small downward caret for the language picker.
export const CARET_DOWN = {
  grid: ['ccccc', '.ccc.', '..c..'],
  palette: { c: '#FBF3E0' },
};
