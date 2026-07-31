import React from 'react';
import PixelSprite from './PixelSprite';
import { COLORS } from '../config';

/**
 * Small pixel-art glyphs used across the UI in place of emojis. Each icon is a
 * compact bitmap; `color` tints the main body, `outline` the border.
 */

const O = COLORS.outline;

const ICONS = {
  apple: {
    grid: ['..s...', '.ccc..', 'ccccc.', 'ccccc.', 'ccccc.', '.ccc..'],
    map: { c: 'C', s: 'L' },
  },
  paw: {
    grid: ['.c.c.', 'c.c.c', '.....', '.ccc.', 'ccccc', '.ccc.'],
    map: { c: 'C' },
  },
  box: {
    grid: ['ccccc', 'cLcLc', 'ccccc', 'ccccc', 'cLcLc', 'ccccc'],
    map: { c: 'C', L: 'O' },
  },
  leaf: {
    grid: ['....c', '..ccc', '.cccc', 'ccOcc', 'ccc..', 'c....'],
    map: { c: 'C', O: 'O' },
  },
  drop: {
    grid: ['..c..', '..c..', '.ccc.', 'ccccc', 'ccccc', '.ccc.'],
    map: { c: 'C' },
  },
  shirt: {
    grid: ['cc.cc', 'ccccc', 'ccccc', '.ccc.', '.ccc.', '.ccc.'],
    map: { c: 'C' },
  },
  wheel: {
    grid: ['.ccc.', 'cOcOc', 'ccccc', 'cOcOc', '.ccc.', '.....'],
    map: { c: 'C', O: 'O' },
  },
  star: {
    grid: ['..c..', '..c..', 'ccccc', '.ccc.', '.c.c.', 'c...c'],
    map: { c: 'C' },
  },
  // UI glyphs
  flame: {
    grid: ['..c..', '.cLc.', 'cLLLc', 'cLLLc', 'cLLLc', '.ccc.'],
    map: { c: 'C', L: 'L' },
  },
  book: {
    grid: ['cc.cc', 'cLcLc', 'cLcLc', 'cLcLc', 'cLcLc', 'ccccc'],
    map: { c: 'C', L: 'O' },
  },
  trophy: {
    grid: ['ccccc', 'cLLLc', 'cLLLc', '.ccc.', '..c..', '.ccc.'],
    map: { c: 'C', L: 'L' },
  },
  seed: {
    grid: ['..O..', '.OcO.', 'OcccO', 'OcccO', '.OcO.', '..O..'],
    map: { c: 'C', O: 'O' },
  },
  heart: {
    grid: ['.c.c.', 'ccccc', 'ccccc', '.ccc.', '..c..', '.....'],
    map: { c: 'C' },
  },
  camera: {
    grid: ['.cc..', 'ccccc', 'cOOOc', 'cOLOc', 'cOOOc', 'ccccc'],
    map: { c: 'C', O: 'O', L: 'L' },
  },
  grid: {
    grid: ['ccccc', 'cO.Oc', 'ccccc', 'cO.Oc', 'ccccc', '.....'],
    map: { c: 'C', O: 'O' },
  },
  people: {
    grid: ['.c.c.', 'ccccc', '.c.c.', 'ccccc', 'ccccc', '.....'],
    map: { c: 'C' },
  },
  sound: {
    grid: ['..cc.', '.ccc.', 'cccLc', 'cccLc', '.ccc.', '..cc.'],
    map: { c: 'C', L: 'L' },
  },
  mic: {
    grid: ['.ccc.', 'ccccc', 'ccccc', '.ccc.', '..c..', '.ccc.'],
    map: { c: 'C' },
  },
  check: {
    grid: ['.....', '....c', '...cc', 'c.cc.', 'ccc..', '.c...'],
    map: { c: 'C' },
  },
  target: {
    grid: ['.ccc.', 'cO.Oc', 'c.L.c', 'cO.Oc', '.ccc.', '.....'],
    map: { c: 'C', O: 'O', L: 'L' },
  },
  lock: {
    grid: ['.ccc.', 'c...c', 'ccccc', 'ccLcc', 'ccccc', 'ccccc'],
    map: { c: 'C', L: 'O' },
  },
  chat: {
    grid: ['ccccc', 'cO.Oc', 'ccccc', 'ccccc', '.c...', 'c....'],
    map: { c: 'C', O: 'O' },
  },
  gear: {
    grid: ['.c.c.', 'ccccc', 'cO.Oc', 'cO.Oc', 'ccccc', '.c.c.'],
    map: { c: 'C', O: 'O' },
  },
  arrowLeft: {
    grid: ['..c..', '.cc..', 'ccccc', '.cc..', '..c..', '.....'],
    map: { c: 'C' },
  },
  close: {
    grid: ['c...c', 'cc.cc', '.ccc.', 'cc.cc', 'c...c', '.....'],
    map: { c: 'C' },
  },
  chevron: {
    grid: ['.c...', '.cc..', '.ccc.', '.cc..', '.c...', '.....'],
    map: { c: 'C' },
  },
  plus: {
    grid: ['..c..', '..c..', 'ccccc', '..c..', '..c..', '.....'],
    map: { c: 'C' },
  },
  minus: {
    grid: ['.....', '.....', 'ccccc', 'ccccc', '.....', '.....'],
    map: { c: 'C' },
  },
  search: {
    grid: ['.ccc.', 'c...c', 'c...c', 'ccccc', '...cc', '....c'],
    map: { c: 'C' },
  },
  images: {
    grid: ['ccccc', 'c.L.c', 'cL.Lc', 'c.LLc', 'ccccc', '.....'],
    map: { c: 'C', L: 'L' },
  },
  flip: {
    grid: ['.ccc.', 'c...c', 'c..cc', 'cc..c', 'c...c', '.ccc.'],
    map: { c: 'C' },
  },
  play: {
    grid: ['cc...', 'cccc.', 'ccccc', 'cccc.', 'cc...', '.....'],
    map: { c: 'C' },
  },
  add: {
    grid: ['.c.c.', 'ccccc', '.c.c.', 'ccccc', '..c..', 'c.c.c'],
    map: { c: 'C' },
  },
};

export default function PixelIcon({
  name,
  size = 18,
  color = COLORS.text,
  light,
  style,
}) {
  const icon = ICONS[name] || ICONS.star;
  const rows = icon.grid.length;
  const pixelSize = Math.max(1, Math.round(size / rows));

  // Build a palette that maps this icon's local keys to actual colors.
  const palette = { O };
  Object.entries(icon.map).forEach(([key, role]) => {
    if (role === 'C') palette[key] = color;
    else if (role === 'O') palette[key] = O;
    else if (role === 'L') palette[key] = light || COLORS.surface;
  });

  return <PixelSprite grid={icon.grid} palette={palette} pixelSize={pixelSize} style={style} />;
}
