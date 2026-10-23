import { DESTINATIONS } from '../config';
import { getPet, updatePet } from '../data/petStore';

/**
 * Souvenirs: the local accessory some places have (DESTINATIONS[].souvenir).
 *
 * While the buddy is at a place, it wears that place's souvenir on the home
 * map for free. Buying one (purchaseService.buySouvenir) adds it to the
 * wardrobe as an outfit for good. Any place already reached can still be
 * bought from the passport; places ahead stay locked until the buddy gets
 * there.
 */

/** Every souvenir, in journey order, with the place it comes from. */
export const SOUVENIRS = DESTINATIONS.filter((d) => d.souvenir).map((d) => ({
  ...d.souvenir,
  place: d.key,
  placeName: d.name,
  from: d.from,
}));

export function findSouvenir(id) {
  return SOUVENIRS.find((s) => s.id === id) || null;
}

/** The place the buddy is at on `island`. Pure. */
export function placeAt(island) {
  let place = DESTINATIONS[0];
  DESTINATIONS.forEach((d) => {
    if (island >= d.from) place = d;
  });
  return place;
}

/**
 * Where each souvenir stands for someone on `island` who owns `ownedOutfits`:
 * 'owned', 'here' (being worn on loan right now), 'available' (a place passed
 * already, still for sale) or 'locked' (not reached yet). Pure.
 */
export function souvenirStatus(souvenir, island, ownedOutfits = []) {
  if (ownedOutfits.includes(souvenir.id)) return 'owned';
  if (island < souvenir.from) return 'locked';
  return placeAt(island).key === souvenir.place ? 'here' : 'available';
}

export function listSouvenirs(island, ownedOutfits) {
  return SOUVENIRS.map((s) => ({ ...s, status: souvenirStatus(s, island, ownedOutfits) }));
}

/**
 * What the buddy wears on the home map: the local souvenir while it is at a
 * place that has one, otherwise whatever it has on. Pure.
 */
export function outfitOnMap(equippedOutfit, island) {
  return placeAt(island).souvenir?.id || equippedOutfit || 'none';
}

/** Whether a souvenir may be sold on `island`: reached already, not owned. */
export function canBuySouvenir(souvenir, island, ownedOutfits) {
  const status = souvenirStatus(souvenir, island, ownedOutfits);
  return status === 'here' || status === 'available';
}

/** Put souvenirs in the wardrobe (and wear the first new one). */
export async function grantSouvenirs(ids, { equip = false } = {}) {
  const pet = await getPet();
  const fresh = ids.filter((id) => findSouvenir(id) && !pet.ownedOutfits.includes(id));
  if (!fresh.length) return pet;
  return updatePet({
    ownedOutfits: [...pet.ownedOutfits, ...fresh],
    ...(equip ? { equippedOutfit: fresh[0] } : {}),
  });
}

/**
 * Make the wardrobe's souvenirs match what the App Store says is owned:
 * add the ones bought (on this device or another), take back refunded ones.
 */
export async function matchSouvenirsTo(ownedIds) {
  const pet = await getPet();
  const isSouvenir = (id) => !!findSouvenir(id);
  const kept = pet.ownedOutfits.filter((id) => !isSouvenir(id) || ownedIds.includes(id));
  const added = ownedIds.filter((id) => isSouvenir(id) && !kept.includes(id));
  const ownedOutfits = [...kept, ...added];
  if (ownedOutfits.length === pet.ownedOutfits.length && !added.length) return pet;
  return updatePet({
    ownedOutfits,
    equippedOutfit: ownedOutfits.includes(pet.equippedOutfit) ? pet.equippedOutfit : 'none',
  });
}
