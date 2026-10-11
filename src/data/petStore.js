import { PET, RETIRED_OUTFITS } from '../config';
import { STORAGE_KEYS, readJSON, writeJSON } from './storage';
import { addCoins } from './walletStore';

// Fields added after the first release. Spread under every stored pet so pets
// saved before species/outfits existed migrate cleanly on read.
const PET_DEFAULTS = {
  species: PET.defaultSpecies,
  ownedOutfits: ['none'],
  equippedOutfit: 'none',
};

/**
 * Take outfits that are no longer sold out of the closet and pay back what
 * they cost. Writes the pet before refunding, so a crash in between loses the
 * refund rather than paying it twice.
 */
async function retireOutfits(pet) {
  const retired = pet.ownedOutfits.filter((id) => id in RETIRED_OUTFITS);
  const wearingRetired = pet.equippedOutfit in RETIRED_OUTFITS;
  if (!retired.length && !wearingRetired) return pet;

  const updated = await writeJSON(STORAGE_KEYS.PET, {
    ...pet,
    ownedOutfits: pet.ownedOutfits.filter((id) => !(id in RETIRED_OUTFITS)),
    equippedOutfit: wearingRetired ? 'none' : pet.equippedOutfit,
  });
  const refund = retired.reduce((sum, id) => sum + RETIRED_OUTFITS[id], 0);
  if (refund) await addCoins(refund);
  return updated;
}

// Screens read the pet in parallel; sharing one read keeps a retired outfit
// from being refunded once per caller.
let pendingRead = null;

/** The pet, created with defaults on first read. */
export function getPet() {
  if (!pendingRead) {
    pendingRead = readPet().finally(() => {
      pendingRead = null;
    });
  }
  return pendingRead;
}

async function readPet() {
  const stored = await readJSON(STORAGE_KEYS.PET, null);
  if (stored) return retireOutfits({ ...PET_DEFAULTS, ...stored });

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
