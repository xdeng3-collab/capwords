import { PET } from '../config';
import { STORAGE_KEYS, readJSON, writeJSON } from './storage';

// Fields added after the first release. Spread under every stored pet so pets
// saved before species/outfits existed migrate cleanly on read.
const PET_DEFAULTS = {
  species: PET.defaultSpecies,
  ownedOutfits: ['none'],
  equippedOutfit: 'none',
};

/** The pet, created with defaults on first read. */
export async function getPet() {
  const stored = await readJSON(STORAGE_KEYS.PET, null);
  if (stored) return { ...PET_DEFAULTS, ...stored };

  return writeJSON(STORAGE_KEYS.PET, {
    ...PET_DEFAULTS,
    name: PET.defaultName,
    named: false, // whether the user has chosen a name yet
    createdAt: new Date().toISOString(),
  });
}

export async function updatePet(updates) {
  const pet = await getPet();
  return writeJSON(STORAGE_KEYS.PET, { ...pet, ...updates });
}
