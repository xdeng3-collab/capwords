import { DEFAULT_DAILY_GOAL, OUTFITS, PET } from '../config';
import { getPet, updatePet } from '../data/petStore';
import { getUserProfile } from '../data/profileStore';
import { getStreak, getWordCountOn } from '../data/progressStore';
import { getCoins, spendCoins } from '../data/walletStore';
import { todayKey, yesterdayKey } from '../utils/date';

/**
 * The buddy: its name and species, the wardrobe, and the mood that makes it
 * worth coming back to.
 */

export { getPet, updatePet };

export async function namePet(name, species) {
  const trimmed = (name || '').trim().slice(0, PET.maxNameLength);
  if (!trimmed) return getPet();
  const updates = { name: trimmed, named: true };
  if (species) updates.species = species;
  return updatePet(updates);
}

/** Switch species (free, anytime). */
export function setPetSpecies(species) {
  return updatePet({ species });
}

/**
 * Buy an outfit with coins. Returns { ok, reason, pet, coins }.
 * On success the outfit is also equipped.
 */
export async function buyOutfit(outfitId) {
  const outfit = OUTFITS.find((o) => o.id === outfitId);
  if (!outfit) return { ok: false, reason: 'unknown_outfit' };

  const pet = await getPet();
  if (pet.ownedOutfits.includes(outfitId)) return { ok: false, reason: 'owned', pet };

  const coins = await spendCoins(outfit.price);
  if (!coins) return { ok: false, reason: 'insufficient_coins', pet };

  const updated = await updatePet({
    ownedOutfits: [...pet.ownedOutfits, outfitId],
    equippedOutfit: outfitId,
  });
  return { ok: true, pet: updated, coins };
}

/** Equip an owned outfit ('none' to undress). */
export async function equipOutfit(outfitId) {
  const pet = await getPet();
  if (!pet.ownedOutfits.includes(outfitId)) return pet;
  return updatePet({ equippedOutfit: outfitId });
}

/**
 * The mood ladder (Duolingo style), as a pure function so it can be reasoned
 * about - and tested - without storage:
 *
 *  - happy   : hit today's goal
 *  - content : learned at least one word today
 *  - sleepy  : nothing learned yet today, streak or no streak
 *  - sad     : had a streak but missed a day (streak broken / at risk)
 *
 * The home screen widget keeps its own copy of this ladder in
 * services/widgetService.js and targets/widget/index.swift.
 */
export function derivePetMood({ wordsToday, dailyGoal, streak, today, yesterday }) {
  if (wordsToday >= dailyGoal) return 'happy';
  if (wordsToday > 0) return 'content';
  const activeRecently = streak.lastActiveDate === today || streak.lastActiveDate === yesterday;
  if (streak.current > 0 && !activeRecently) return 'sad';
  return 'sleepy';
}

/**
 * Everything the Buddy and Wardrobe screens draw, in one read.
 */
export async function getPetState() {
  const [pet, profile, streak, wordsToday, coins] = await Promise.all([
    getPet(),
    getUserProfile(),
    getStreak(),
    getWordCountOn(todayKey()),
    getCoins(),
  ]);

  const dailyGoal = profile.dailyGoal || DEFAULT_DAILY_GOAL;
  const mood = derivePetMood({
    wordsToday,
    dailyGoal,
    streak,
    today: todayKey(),
    yesterday: yesterdayKey(),
  });

  return {
    mood,
    name: pet.name,
    named: pet.named,
    species: pet.species,
    equippedOutfit: pet.equippedOutfit,
    ownedOutfits: pet.ownedOutfits,
    coins: coins.balance,
    wordsToday,
    dailyGoal,
    goalReached: wordsToday >= dailyGoal,
    streak: streak.current,
    longestStreak: streak.longest,
  };
}
