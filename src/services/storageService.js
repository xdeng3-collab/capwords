import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_DAILY_GOAL,
  GOAL_CHANGE_COOLDOWN_DAYS,
  PRICING,
  PET,
  COINS,
  OUTFITS,
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
};

// ==================== Stickers ====================

export async function saveSticker(sticker) {
  const stickers = await getStickers();
  const newSticker = {
    ...sticker,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
  };
  stickers.unshift(newSticker);
  await AsyncStorage.setItem(STORAGE_KEYS.STICKERS, JSON.stringify(stickers));
  
  // Update daily word count
  await incrementDailyWords();
  
  return newSticker;
}

export async function getStickers() {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.STICKERS);
  return data ? JSON.parse(data) : [];
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
  const stickers = await getStickers();
  const filtered = stickers.filter(s => s.id !== id);
  await AsyncStorage.setItem(STORAGE_KEYS.STICKERS, JSON.stringify(filtered));
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

// ==================== Subscription ====================

export async function getSubscription() {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.SUBSCRIPTION);
  if (data) return JSON.parse(data);
  
  return {
    type: 'free', // 'free', 'per_word', 'monthly', 'yearly'
    wordBalance: 0,
    expiresAt: null,
  };
}

export async function updateSubscription(subData) {
  const current = await getSubscription();
  const updated = { ...current, ...subData };
  await AsyncStorage.setItem(STORAGE_KEYS.SUBSCRIPTION, JSON.stringify(updated));
  return updated;
}

export async function canLearnWord() {
  const sub = await getSubscription();
  
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
