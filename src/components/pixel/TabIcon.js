import React from 'react';
import PixelSprite from './PixelSprite';
import { COLORS } from '../../theme';

/**
 * Full-colour pixel icons for the tab bar. Unlike PixelIcon (one tint), each
 * of these has its own palette so the five tabs are told apart at a glance:
 * a house for home, a sticker book, a camera, two buddies, and you.
 */

const O = COLORS.outline;

const TAB_ICONS = {
  home: {
    grid: [
      '....OO....',
      '...OrrO.OO',
      '..OrrrrOcO',
      '.OrrrrrrOO',
      'OOOOOOOOOO',
      '.OwwwwwwO.',
      '.ObbwwddO.',
      '.ObbwwddO.',
      '.OwwwwddO.',
      '.OOOOOOOO.',
    ],
    palette: { O, r: '#E8574B', c: '#B8763A', w: '#FBF3E0', b: '#8FC6E8', d: '#B8763A' },
  },
  book: {
    grid: [
      '.OOOOOOOOO.',
      'OcpppOpppcO',
      'OcplpOplpcO',
      'OcpppOpppcO',
      'OcplpOplpcO',
      'OcpppOpppcO',
      'OccccOccccO',
      '.OOOOOOOOO.',
    ],
    palette: { O, c: '#5D8FC4', p: '#FBF3E0', l: '#E8574B' },
  },
  camera: {
    grid: [
      '..OOO.....',
      '.OkkkOOOOO',
      'OkkkkkkkrO',
      'OkkOOOOkkO',
      'OkOLbbLOkO',
      'OkOLbbLOkO',
      'OkkOOOOkkO',
      'OkkkkkkkkO',
      '.OOOOOOOO.',
    ],
    palette: { O, k: '#FBF3E0', r: '#E8574B', L: '#5D8FC4', b: '#8FC6E8' },
  },
  pals: {
    grid: [
      '.OOO...OOO.',
      'OaaaO.ObbbO',
      'OeaeO.ObebO',
      'OaaaO.ObbbO',
      '.OOO...OOO.',
      '.OOO...OOO.',
      'OaaaO.ObbbO',
      'OaaaO.ObbbO',
      'OOOOO.OOOOO',
    ],
    palette: { O, a: '#F2A65A', b: '#7CB06A', e: O },
  },
  me: {
    grid: [
      '..OOOOOO..',
      '.OhhhhhhO.',
      '.OhsssshO.',
      '.OsessesO.',
      '.OssssssO.',
      '..OOOOOO..',
      '.OOpppOOO.',
      'OppppppppO',
      'OppppppppO',
      'OOOOOOOOOO',
    ],
    palette: { O, h: '#8C5A22', s: '#F6D3A8', e: O, p: '#B5638F' },
  },
};

export default function TabIcon({ name, size = 26, style }) {
  const icon = TAB_ICONS[name] || TAB_ICONS.home;
  const pixelSize = Math.max(1, Math.round(size / icon.grid.length));
  return <PixelSprite grid={icon.grid} palette={icon.palette} pixelSize={pixelSize} style={style} />;
}
