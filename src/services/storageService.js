import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import {
  DEFAULT_DAILY_GOAL,
  GOAL_CHANGE_COOLDOWN_DAYS,
  PRICING,
  PET,
  COINS,
  OUTFITS,
  PROMO_CODES,
} from '../config';

const STORAGE_KEYS = {
  STICKERS: 'capwords_stickers',
  USER_PROFILE: 'capwords_profile',
  FRIENDS: 'capwords_friends',
  STREAK: 'capwords_streak',
  SETTINGS: 'capwords_settings',
  SUBSCRIPTION: 'capwords_subscription',
  DAILY_WORDS: 'capwords_daily_words',
  PET: 'capwords_pet',
  COINS: 'capwords_coins',
  CHEERS: 'capwords_cheers',
  LAST_CHECK_IN: 'capwords_last_check_in',
  PRACTICED_STICKERS: 'capwords_practiced_stickers',
};

// ==================== Stickers ====================

const STICKER_IMAGE_DIR = `${FileSystem.documentDirectory || ''}stickers/`;

/**
 * Copy a freshly captured photo from the camera's temporary cache into the
 * app's permanent documents folder. Photos live only on the user's device —
 * nothing is uploaded, so there is no server storage cost. Cache URIs can be
 * purged by iOS at any time, which is why we copy them out.
 *
 * Only the `stickers/<id>.jpg` sub-path is stored, never the absolute URI:
 * iOS gives the app a fresh container UUID on every reinstall, so an absolute
 * path saved today points nowhere tomorrow. resolveStickerImage rebuilds the
 * full URI against the current documents directory at read time.
 */
async function persistStickerImage(imageUri, id) {
  if (!imageUri || !FileSystem.documentDirectory) return imageUri;
  try {
    await FileSystem.makeDirectoryAsync(STICKER_IMAGE_DIR, { intermediates: true }).catch(() => {});
    const relative = `stickers/${id}.jpg`;
    await FileSystem.copyAsync({ from: imageUri, to: `${FileSystem.documentDirectory}${relative}` });
    return relative;
  } catch (e) {
    return imageUri; // fall back to the original URI
  }
}

/**
 * Turn a stored image reference into a URI that works right now. Handles both
 * the relative paths written today and the absolute ones written by earlier
 * versions, whose container UUID has since gone stale.
 */
export function resolveStickerImage(stored) {
  if (!stored) return stored;
  const documents = FileSystem.documentDirectory || '';
  const match = stored.match(/stickers\/[^/]+$/);
  if (match) return `${documents}${match[0]}`;
  return stored; // an unrecognised URI (e.g. a picked photo we could not copy)
}

export async function saveSticker(sticker) {
  const stickers = await getRawStickers();
  const id = Date.now().toString();
  const imageUri = await persistStickerImage(sticker.imageUri, id);
  const newSticker = {
    ...sticker,
    imageUri,
    id,
    createdAt: new Date().toISOString(),
  };
  stickers.unshift(newSticker);
  await AsyncStorage.setItem(STORAGE_KEYS.STICKERS, JSON.stringify(stickers));
  
  // Update daily word count (also awards learning coins)
  const coinsEarned = await incrementDailyWords();

  return { ...newSticker, imageUri: resolveStickerImage(imageUri), coinsEarned };
}

/** Stickers exactly as stored. Use this before writing the list back. */
async function getRawStickers() {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.STICKERS);
  return data ? JSON.parse(data) : [];
}

export async function getStickers() {
  const stickers = await getRawStickers();
  // Resolve on read so every screen gets a URI valid for this install.
  return stickers.map((s) => ({ ...s, imageUri: resolveStickerImage(s.imageUri) }));
}

export async function getStickersByDate() {
  const stickers = await getStickers();
  const grouped = {};
  
  stickers.forEach(sticker => {
    const date = sticker.createdAt.split('T')[0];
    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(sticker);
  });
  
  return Object.entries(grouped)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, items]) => ({ date, items }));
}

export async function deleteSticker(id) {
  const stickers = await getRawStickers();
  const sticker = stickers.find((s) => s.id === id);
  const filtered = stickers.filter(s => s.id !== id);
  await AsyncStorage.setItem(STORAGE_KEYS.STICKERS, JSON.stringify(filtered));
  // Clean up the stored photo (best effort).
  const resolved = resolveStickerImage(sticker?.imageUri);
  if (resolved?.startsWith(STICKER_IMAGE_DIR)) {
    FileSystem.deleteAsync(resolved, { idempotent: true }).catch(() => {});
  }
}

// ==================== User Profile ====================

export async function getUserProfile() {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
  if (data) return JSON.parse(data);
  
  const defaultProfile = {
    id: Date.now().toString(),
    name: 'CapWords User',
    avatar: null,
    targetLanguage: 'es',
    nativeLanguage: 'en',
    dailyGoal: DEFAULT_DAILY_GOAL,
    lastGoalChange: null,
    // How onboarding said they want to add photos: 'camera' or 'library'.
    // Library-only people are never asked for the camera until they reach
    // for the shutter themselves.
    photoSource: 'camera',
    // First-run setup has not run yet on a brand new profile.
    onboarded: false,
    joinDate: new Date().toISOString(),
  };
  await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(defaultProfile));
  return defaultProfile;
}

export async function updateUserProfile(updates) {
  const profile = await getUserProfile();
  const updated = { ...profile, ...updates };
  await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(updated));
  return updated;
}

/**
 * Whether first-run setup is done. Profiles written before onboarding existed
 * carry no flag at all — those people already have a working app, so they are
 * never sent back through it. Only an explicit `false` means "still to do".
 */
export async function hasCompletedOnboarding() {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
  if (!data) return false;
  return JSON.parse(data).onboarded !== false;
}

/**
 * Save every answer from onboarding in one go: the four decisions plus how
 * they said they want to add photos.
 */
export async function completeOnboarding({
  targetLanguage,
  species,
  petName,
  dailyGoal,
  photoSource,
}) {
  await namePet(petName, species);
  return updateUserProfile({
    targetLanguage,
    dailyGoal,
    photoSource,
    onboarded: true,
  });
}

export async function canChangeGoal() {
  const profile = await getUserProfile();
  if (!profile.lastGoalChange) return true;
  
  const lastChange = new Date(profile.lastGoalChange);
  const now = new Date();
  const daysSinceChange = (now - lastChange) / (1000 * 60 * 60 * 24);
  return daysSinceChange >= GOAL_CHANGE_COOLDOWN_DAYS;
}

// ==================== Streak ====================

export async function getStreak() {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.STREAK);
  if (data) return JSON.parse(data);
  
  return {
    current: 0,
    longest: 0,
    lastActiveDate: null,
  };
}

export async function updateStreak() {
  const streak = await getStreak();
  const profile = await getUserProfile();
  const dailyWords = await getDailyWordCount();
  const today = new Date().toISOString().split('T')[0];
  
  if (dailyWords >= profile.dailyGoal) {
    if (streak.lastActiveDate === today) {
      return streak; // Already counted today
    }
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    if (streak.lastActiveDate === yesterdayStr || streak.current === 0) {
      streak.current += 1;
    } else {
      streak.current = 1; // Reset streak
    }
    
    streak.longest = Math.max(streak.longest, streak.current);
    streak.lastActiveDate = today;
    
    await AsyncStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify(streak));
  }
  
  return streak;
}

// ==================== Daily Words ====================

async function incrementDailyWords() {
  const today = new Date().toISOString().split('T')[0];
  const data = await AsyncStorage.getItem(STORAGE_KEYS.DAILY_WORDS);
  const dailyData = data ? JSON.parse(data) : {};
  
  dailyData[today] = (dailyData[today] || 0) + 1;
  await AsyncStorage.setItem(STORAGE_KEYS.DAILY_WORDS, JSON.stringify(dailyData));
  
  // Earn coins for learning; bonus when the daily goal is first reached.
  const profile = await getUserProfile();
  let earned = COINS.perWord;
  if (dailyData[today] === profile.dailyGoal) earned += COINS.goalBonus;
  await addCoins(earned);

  // Check and update streak
  await updateStreak();

  return earned;
}

export async function getDailyWordCount(date) {
  const targetDate = date || new Date().toISOString().split('T')[0];
  const data = await AsyncStorage.getItem(STORAGE_KEYS.DAILY_WORDS);
  const dailyData = data ? JSON.parse(data) : {};
  return dailyData[targetDate] || 0;
}

// ==================== Friends ====================
// Pals and cheers moved to Supabase (services/friendService.js). They have to
// live there: a friend is another real account, and "once per day" has to be
// decided somewhere a reinstall cannot reset. The two storage keys are kept
// in STORAGE_KEYS only so the legacy sweep and signOut still clear them.

// ==================== Subscription ====================

export async function getSubscription() {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.SUBSCRIPTION);
  if (data) return JSON.parse(data);
  
  return {
    type: 'free', // 'free', 'per_word', 'monthly', 'yearly', 'unlimited'
    wordBalance: 0,
    expiresAt: null,
    promoCode: null,
  };
}

export async function updateSubscription(subData) {
  const current = await getSubscription();
  const updated = { ...current, ...subData };
  await AsyncStorage.setItem(STORAGE_KEYS.SUBSCRIPTION, JSON.stringify(updated));
  return updated;
}

// Redeem a promo code. Returns { ok, message, subscription } so the caller can
// show the outcome without needing to know which codes exist.
export async function redeemPromoCode(rawCode) {
  const code = (rawCode || '').trim().toUpperCase();
  if (!code) {
    return { ok: false, message: 'Enter a promo code first.' };
  }

  const promo = PROMO_CODES[code];
  if (!promo) {
    return { ok: false, message: "That code isn't valid. Check the spelling and try again." };
  }

  const current = await getSubscription();
  if (current.promoCode === code) {
    return { ok: false, message: 'This code is already active on your account.' };
  }

  const subscription = await updateSubscription({
    type: promo.plan,
    // Unlimited plans never expire, so clear any leftover subscription date.
    expiresAt: null,
    promoCode: code,
  });

  return { ok: true, message: promo.message, subscription };
}

export async function canLearnWord() {
  const sub = await getSubscription();
  
  if (sub.type === 'unlimited') {
    return { allowed: true, reason: 'promo' };
  }
  
  if (sub.type === 'monthly' || sub.type === 'yearly') {
    if (new Date(sub.expiresAt) > new Date()) {
      return { allowed: true, reason: 'subscription' };
    }
  }
  
  if (sub.type === 'per_word' && sub.wordBalance > 0) {
    return { allowed: true, reason: 'balance' };
  }
  
  // Free tier check
  const dailyCount = await getDailyWordCount();
  if (dailyCount < PRICING.freeWordsPerDay) {
    return { allowed: true, reason: 'free' };
  }
  
  return { allowed: false, reason: 'limit_reached' };
}

export async function consumeWord() {
  const sub = await getSubscription();
  if (sub.type === 'per_word') {
    sub.wordBalance = Math.max(0, sub.wordBalance - 1);
    await updateSubscription(sub);
  }
}

// ==================== Settings ====================

export async function getSettings() {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
  if (data) return JSON.parse(data);
  
  return {
    notifications: true,
    soundEffects: true,
    hapticFeedback: true,
    autoSpeak: true,
  };
}

export async function updateSettings(updates) {
  const settings = await getSettings();
  const updated = { ...settings, ...updates };
  await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
  return updated;
}

// ==================== Demo data cleanup ====================

// Sample stickers that an earlier build could seed from the profile screen.
// The button is gone; this sweeps up whatever it left behind.
const DEMO_STICKER_PREFIX = 'demo_';

/**
 * Clear data that older versions left on the phone. Idempotent and cheap — it
 * only writes when it actually finds something — so it is safe to run on
 * every launch.
 *
 * Two things get swept: seeded demo stickers, and the whole local friends
 * list. That list held people picked out of a hardcoded search — they were
 * never real accounts, and nothing reads the key any more now that pals come
 * from Supabase, so leaving it would just be a puzzle for the next person.
 */
export async function removeDemoData() {
  const stickers = await getStickers();
  const keptStickers = stickers.filter((s) => !String(s.id).startsWith(DEMO_STICKER_PREFIX));
  if (keptStickers.length !== stickers.length) {
    await AsyncStorage.setItem(STORAGE_KEYS.STICKERS, JSON.stringify(keptStickers));
  }

  const legacy = await AsyncStorage.multiGet([STORAGE_KEYS.FRIENDS, STORAGE_KEYS.CHEERS]);
  const stale = legacy.filter(([, value]) => value != null).map(([key]) => key);
  if (stale.length) await AsyncStorage.multiRemove(stale);
}

// ==================== Sign out ====================

/**
 * Erase everything this device knows about the person: profile, collection and
 * its photos, pals, pet, streak, and coins. There is no account server —
 * all of it lives on the phone — so signing out is exactly this wipe.
 *
 * A paid plan is not lost with it: the entitlement belongs to the Apple ID, so
 * the App Store sync on next launch (or Restore Purchases) brings it back.
 */
export async function signOut() {
  await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
  if (FileSystem.documentDirectory) {
    await FileSystem.deleteAsync(STICKER_IMAGE_DIR, { idempotent: true }).catch(() => {});
  }
}

// ==================== Coins ====================

export async function getCoins() {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.COINS);
  return data ? JSON.parse(data) : { balance: 0, lifetime: 0 };
}

export async function addCoins(amount) {
  const coins = await getCoins();
  coins.balance += amount;
  coins.lifetime += Math.max(amount, 0);
  await AsyncStorage.setItem(STORAGE_KEYS.COINS, JSON.stringify(coins));
  return coins;
}

/**
 * Daily check-in gift: claimable once per day from the Buddy screen.
 * Returns { claimed, earned } — claimed=false when already taken today.
 */
export async function claimDailyGift() {
  const today = new Date().toISOString().split('T')[0];
  const last = await AsyncStorage.getItem(STORAGE_KEYS.LAST_CHECK_IN);
  if (last === today) return { claimed: false, earned: 0 };
  await AsyncStorage.setItem(STORAGE_KEYS.LAST_CHECK_IN, today);
  const coins = await addCoins(COINS.checkInBonus);
  return { claimed: true, earned: COINS.checkInBonus, coins };
}

export async function isDailyGiftAvailable() {
  const today = new Date().toISOString().split('T')[0];
  const last = await AsyncStorage.getItem(STORAGE_KEYS.LAST_CHECK_IN);
  return last !== today;
}

/**
 * Award the pronunciation-practice bonus once per sticker.
 * Returns the coins earned (0 if this sticker was already practiced).
 */
export async function awardPracticeBonus(stickerId) {
  if (!stickerId) return 0;
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.PRACTICED_STICKERS);
  const practiced = raw ? JSON.parse(raw) : [];
  if (practiced.includes(stickerId)) return 0;
  practiced.push(stickerId);
  await AsyncStorage.setItem(STORAGE_KEYS.PRACTICED_STICKERS, JSON.stringify(practiced));
  await addCoins(COINS.practiceBonus);
  return COINS.practiceBonus;
}

/** Returns the updated coins object, or null if the balance is insufficient. */
export async function spendCoins(amount) {
  const coins = await getCoins();
  if (coins.balance < amount) return null;
  coins.balance -= amount;
  await AsyncStorage.setItem(STORAGE_KEYS.COINS, JSON.stringify(coins));
  return coins;
}

// ==================== Pet ====================

const PET_DEFAULTS = {
  species: PET.defaultSpecies, // 'cat' | 'dog'
  ownedOutfits: ['none'],
  equippedOutfit: 'none',
};

export async function getPet() {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.PET);
  // Spread defaults first so pets saved before species/outfits existed migrate cleanly.
  if (data) return { ...PET_DEFAULTS, ...JSON.parse(data) };

  const defaultPet = {
    ...PET_DEFAULTS,
    name: PET.defaultName,
    named: false, // whether the user has chosen a name yet
    createdAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(STORAGE_KEYS.PET, JSON.stringify(defaultPet));
  return defaultPet;
}

export async function updatePet(updates) {
  const pet = await getPet();
  const updated = { ...pet, ...updates };
  await AsyncStorage.setItem(STORAGE_KEYS.PET, JSON.stringify(updated));
  return updated;
}

export async function namePet(name, species) {
  const trimmed = (name || '').trim().slice(0, PET.maxNameLength);
  if (!trimmed) return getPet();
  const updates = { name: trimmed, named: true };
  if (species) updates.species = species;
  return updatePet(updates);
}

/** Switch between cat and dog (free, anytime). */
export async function setPetSpecies(species) {
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
 * Derive the pet's mood from streak + today's progress (Duolingo style).
 * Returns { mood, name, wordsToday, dailyGoal, streak, goalReached }.
 *
 * Mood ladder:
 *  - happy   : hit today's goal
 *  - content : learned at least one word today (progressing)
 *  - sleepy  : nothing learned yet today, streak or no streak
 *  - sad     : had a streak but missed a day (streak broken / at risk)
 */
export async function getPetState() {
  const [pet, profile, streak, wordsToday, coins] = await Promise.all([
    getPet(),
    getUserProfile(),
    getStreak(),
    getDailyWordCount(),
    getCoins(),
  ]);

  const dailyGoal = profile.dailyGoal || DEFAULT_DAILY_GOAL;
  const goalReached = wordsToday >= dailyGoal;
  const today = new Date().toISOString().split('T')[0];

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // Was the user active recently? lastActiveDate is today or yesterday = fresh.
  const activeRecently =
    streak.lastActiveDate === today || streak.lastActiveDate === yesterdayStr;

  let mood;
  if (goalReached) {
    mood = 'happy';
  } else if (wordsToday > 0) {
    mood = 'content';
  } else if (streak.current > 0 && activeRecently) {
    // The day simply hasn't started — the buddy is still asleep, not upset.
    mood = 'sleepy';
  } else if (streak.current > 0 && !activeRecently) {
    // Had a streak but has been away — the pet misses you.
    mood = 'sad';
  } else {
    mood = 'sleepy';
  }

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
    goalReached,
    streak: streak.current,
    longestStreak: streak.longest,
  };
}
