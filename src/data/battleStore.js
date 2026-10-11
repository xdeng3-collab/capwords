import { BATTLE } from '../config';
import { STORAGE_KEYS, readJSON, writeJSON } from './storage';

// Spread under whatever is stored, so fields added later migrate on read.
const BATTLE_DEFAULTS = {
  ammo: BATTLE.starterAmmo, // poops in the stockpile
  highestCleared: 0, // the last level beaten; the next fight is this + 1
  // The level whose entry is already paid for (by poops, or by a coin retry)
  // and not yet won or lost. Entering it again costs nothing.
  paidLevel: null,
  wins: 0,
  losses: 0,
};

export async function getBattle() {
  const stored = await readJSON(STORAGE_KEYS.BATTLE, null);
  return { ...BATTLE_DEFAULTS, ...stored };
}

export async function updateBattle(updates) {
  const battle = await getBattle();
  return writeJSON(STORAGE_KEYS.BATTLE, { ...battle, ...updates });
}

export async function addAmmo(amount) {
  const battle = await getBattle();
  return writeJSON(STORAGE_KEYS.BATTLE, { ...battle, ammo: battle.ammo + amount });
}
