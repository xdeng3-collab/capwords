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

export async function getFriends() {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.FRIENDS);
  return data ? JSON.parse(data) : [];
}

export async function addFriend(friendData) {
  const friends = await getFriends();
  const friend = {
    ...friendData,
    id: friendData.id || Date.now().toString(),
    addedAt: new Date().toISOString(),
  };
  friends.push(friend);
  await AsyncStorage.setItem(STORAGE_KEYS.FRIENDS, JSON.stringify(friends));
  return friend;
}

export async function removeFriend(friendId) {
  const friends = await getFriends();
  const filtered = friends.filter(f => f.id !== friendId);
  await AsyncStorage.setItem(STORAGE_KEYS.FRIENDS, JSON.stringify(filtered));
}

// ==================== Cheers ====================
// Friend congrats reset daily (Duolingo-style): you can cheer each friend
// once per day, and the "sent" state survives app restarts.

export async function getTodayCheers() {
  const today = new Date().toISOString().split('T')[0];
  const data = await AsyncStorage.getItem(STORAGE_KEYS.CHEERS);
  const parsed = data ? JSON.parse(data) : null;
  if (!parsed || parsed.date !== today) return { date: today, ids: {} };
  return parsed;
}

export async function cheerFriend(friendId) {
  const cheers = await getTodayCheers();
  cheers.ids[friendId] = true;
  await AsyncStorage.setItem(STORAGE_KEYS.CHEERS, JSON.stringify(cheers));
  return cheers;
}

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

// ==================== Demo data (dev only) ====================

// Example sentences + fun facts for a few demo words so the detail screen
// can be previewed. Real captures get these from the AI.
const DEMO_LEARN = {
  Manzana: {
    exampleSentence: 'Quiero comer una manzana roja.',
    sentenceTranslation: 'I want to eat a red apple.',
    funFact: '"Manzana" also means "city block" in Spanish — ask for directions and you might hear it!',
  },
  Perro: {
    exampleSentence: 'Mi perro juega en el parque.',
    sentenceTranslation: 'My dog plays in the park.',
    funFact: 'Spanish dogs say "guau guau" instead of "woof woof".',
  },
  Café: {
    exampleSentence: 'Un café con leche, por favor.',
    sentenceTranslation: 'A coffee with milk, please.',
    funFact: '"Café" is also the word for the color brown in much of Latin America.',
  },
};

const DEMO_STICKERS = [
  // [word, english, pronunciation, category, daysAgo, place]
  ['Manzana', 'Apple', 'man-SAH-nah', 'food', 0, 'Palo Alto, CA'],
  ['Taza', 'Cup', 'TAH-sah', 'object', 0, 'Palo Alto, CA'],
  ['Flor', 'Flower', 'flor', 'nature', 0, 'Menlo Park, CA'],
  ['Perro', 'Dog', 'PEH-rroh', 'animal', 1, 'San Francisco, CA'],
  ['Silla', 'Chair', 'SEE-yah', 'object', 1, 'San Francisco, CA'],
  ['Café', 'Coffee', 'kah-FEH', 'drink', 1, 'San Francisco, CA'],
  ['Zapato', 'Shoe', 'sah-PAH-toh', 'clothing', 3, 'Mountain View, CA'],
  ['Árbol', 'Tree', 'AR-bol', 'nature', 3, 'Mountain View, CA'],
  ['Gato', 'Cat', 'GAH-toh', 'animal', 5, 'Berkeley, CA'],
  ['Libro', 'Book', 'LEE-broh', 'object', 5, 'Berkeley, CA'],
  ['Bicicleta', 'Bicycle', 'bee-see-KLEH-tah', 'vehicle', 7, 'Santa Cruz, CA'],
  ['Pan', 'Bread', 'pahn', 'food', 7, 'Santa Cruz, CA'],
];

const DEMO_FRIENDS = [
  { id: '101', name: 'Sarah Chen', avatar: null, streak: 12, wordsToday: 8, pet: { name: 'Mochi', species: 'bunny', outfit: 'bow' } },
  { id: '102', name: 'Marco Rivera', avatar: null, streak: 45, wordsToday: 5, pet: { name: 'Rocky', species: 'dog', outfit: 'cap' } },
  { id: '103', name: 'Yuki Tanaka', avatar: null, streak: 7, wordsToday: 3, pet: { name: 'Tofu', species: 'cat', outfit: 'none' } },
];

/**
 * Populate the Book (stickers) and Pals (friends) with sample data so the
 * screens can be tested without capturing real photos. Safe to run more than
 * once — demo entries are not duplicated. Dev/testing use only.
 */
export async function seedDemoData() {
  // Stickers spread over the past week, rendered with category-icon fallbacks.
  const stickers = await getStickers();
  const dailyRaw = await AsyncStorage.getItem(STORAGE_KEYS.DAILY_WORDS);
  const dailyData = dailyRaw ? JSON.parse(dailyRaw) : {};

  DEMO_STICKERS.forEach(([word, english, pronunciation, category, daysAgo, place], i) => {
    const id = `demo_${i}`;
    const existing = stickers.find((s) => s.id === id);
    if (existing) {
      if (!existing.location && place) {
        existing.location = { latitude: null, longitude: null, place };
      }
      if (!existing.exampleSentence && DEMO_LEARN[word]) {
        Object.assign(existing, DEMO_LEARN[word]);
      }
      return;
    }
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    stickers.push({
      id,
      imageUri: null,
      word,
      english,
      pronunciation,
      description: `A common word you will hear every day: "${word}" means ${english.toLowerCase()}.`,
      category,
      language: 'es',
      location: place ? { latitude: null, longitude: null, place } : null,
      createdAt: date.toISOString(),
      ...(DEMO_LEARN[word] || {}),
    });
    const day = date.toISOString().split('T')[0];
    dailyData[day] = (dailyData[day] || 0) + 1;
  });

  stickers.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  await AsyncStorage.setItem(STORAGE_KEYS.STICKERS, JSON.stringify(stickers));
  await AsyncStorage.setItem(STORAGE_KEYS.DAILY_WORDS, JSON.stringify(dailyData));

  // Friends for the Pals tab.
  const friends = await getFriends();
  for (const friend of DEMO_FRIENDS) {
    const existing = friends.find((f) => f.id === friend.id);
    if (existing) {
      if (!existing.pet) existing.pet = friend.pet;
    } else {
      friends.push({ ...friend, addedAt: new Date().toISOString() });
    }
  }
  await AsyncStorage.setItem(STORAGE_KEYS.FRIENDS, JSON.stringify(friends));

  // A little streak history and pocket money so pet + wardrobe feel alive.
  const streak = await getStreak();
  if (streak.current === 0) {
    const today = new Date().toISOString().split('T')[0];
    await AsyncStorage.setItem(
      STORAGE_KEYS.STREAK,
      JSON.stringify({ current: 3, longest: 5, lastActiveDate: today })
    );
  }
  await addCoins(60);
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
 *  - neutral : nothing yet today but streak is alive
 *  - sleepy  : brand new / no activity and no streak
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
    mood = 'neutral';
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
