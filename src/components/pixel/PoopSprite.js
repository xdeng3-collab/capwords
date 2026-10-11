import React from 'react';
import PixelSprite from './PixelSprite';

/**
 * The poop: battle ammo, earned one per word learned. Drawn from a grid like
 * everything else, so it scales from a chip icon to a flying projectile.
 */
const GRID = [
  '.....oo.....',
  '....obbo....',
  '...obhbbo...',
  '..oobbbboo..',
  '.obbhbbbbbo.',
  '.obbbbbbddo.',
  'oobbbbbbbboo',
  'obwkbbbbwkbo',
  'obbbbmmbbbbo',
  'obddddddddbo',
  '.oooooooooo.',
];

const PALETTE = {
  o: '#3A2A1A',
  b: '#9B6A3C',
  h: '#C99A66',
  d: '#75492A',
  w: '#FFFFFF',
  k: '#2E2018',
  m: '#3A2A1A',
};

// Spent ammo: the same shape, washed out.
const EMPTY_PALETTE = {
  o: '#B9A88A',
  b: '#E3D5B8',
  h: '#E3D5B8',
  d: '#D6C6A5',
  w: '#E3D5B8',
  k: '#D6C6A5',
  m: '#D6C6A5',
};

export default function PoopSprite({ pixelSize = 2, empty = false, style }) {
  return (
    <PixelSprite
      grid={GRID}
      palette={empty ? EMPTY_PALETTE : PALETTE}
      pixelSize={pixelSize}
      style={style}
    />
  );
}
