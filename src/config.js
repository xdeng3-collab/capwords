// DeepSeek API Configuration
// API key should be set via environment variable or .env file
// Create a .env file with: DEEPSEEK_API_KEY=your_key_here
export const DEEPSEEK_API_KEY = process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY || '';
export const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1';
// Vision model for photo recognition (the only DeepSeek model that accepts images)
export const DEEPSEEK_VISION_MODEL = 'deepseek-v4-flash-vision-exp';
// Text model for pronunciation guides / evaluation
export const DEEPSEEK_MODEL = 'deepseek-v4-flash';

// Supported languages
export const LANGUAGES = [
  { code: 'en', name: 'English', short: 'EN' },
  { code: 'zh', name: '中文', short: 'ZH' },
  { code: 'es', name: 'Español', short: 'ES' },
  { code: 'fr', name: 'Français', short: 'FR' },
  { code: 'de', name: 'Deutsch', short: 'DE' },
  { code: 'ja', name: '日本語', short: 'JA' },
  { code: 'ko', name: '한국어', short: 'KO' },
  { code: 'pt', name: 'Português', short: 'PT' },
  { code: 'it', name: 'Italiano', short: 'IT' },
  { code: 'ru', name: 'Русский', short: 'RU' },
  { code: 'ar', name: 'العربية', short: 'AR' },
  { code: 'hi', name: 'हिन्दी', short: 'HI' },
];

// Pricing Configuration
// Cost analysis per word:
// - Image recognition: ~500 input tokens + ~200 output tokens
// - Input cost: $0.14/1M * 500 = $0.00007
// - Output cost: $0.28/1M * 200 = $0.000056
// - With system prompts, retries, overhead: ~$0.0003 per word
// - Infrastructure (storage, CDN, servers): ~$0.002 per word
// - Total cost per word: ~$0.0025
// - Selling price with margin: $0.01 per word (4x margin)
export const PRICING = {
  perWord: 0.01, // $0.01 per word
  monthly: 4.99, // $4.99/month - unlimited words
  yearly: 39.99, // $39.99/year - unlimited words (33% discount)
  freeWordsPerDay: 3, // Free tier: 3 words per day
};

// Streak & Goals
export const DEFAULT_DAILY_GOAL = 5; // Default daily word target
export const MIN_DAILY_GOAL = 1;
export const MAX_DAILY_GOAL = 50;
export const GOAL_CHANGE_COOLDOWN_DAYS = 7; // Can change goal once a week

// ==================== Pet ====================
// Pet mood is derived from streak + daily progress (Duolingo style).
export const PET = {
  defaultName: 'Biscuit',
  maxNameLength: 12,
  defaultSpecies: 'cat',
};

// Available pet species. Users pick one when naming their buddy and can
// switch for free in the Wardrobe.
export const PET_SPECIES = [
  { id: 'cat', name: 'Cat' },
  { id: 'dog', name: 'Dog' },
  { id: 'bunny', name: 'Bunny' },
];

// ==================== Coins & Outfits ====================
// Coins are earned by learning words and spent on pet outfits.
// Coin packs can also be purchased with real money (App Store / Play billing).
export const COINS = {
  perWord: 2, // coins earned per word learned
  goalBonus: 10, // bonus for hitting the daily goal
  packs: [
    { id: 'coins_small', coins: 50, price: 0.99 },
    { id: 'coins_medium', coins: 150, price: 2.49 },
    { id: 'coins_large', coins: 400, price: 4.99 },
  ],
};

// Outfit catalog. Sprites are defined in components/PetSprite.js.
export const OUTFITS = [
  { id: 'none', name: 'Nothing', price: 0, description: 'Just natural fluff.' },
  { id: 'bow', name: 'Ribbon Bow', price: 25, description: 'A sweet little bow.' },
  { id: 'scarf', name: 'Cozy Scarf', price: 40, description: 'Warm and stylish.' },
  { id: 'cap', name: 'Snap Cap', price: 60, description: 'For sporty buddies.' },
  { id: 'crown', name: 'Royal Crown', price: 150, description: 'Word royalty only.' },
];

// Mood levels, worst -> best. Drives pet expression and copy.
export const PET_MOODS = {
  sad: {
    key: 'sad',
    label: 'misses you',
    line: "I haven't seen a new word in a while...",
  },
  neutral: {
    key: 'neutral',
    label: 'is waiting',
    line: 'Ready to learn a word today?',
  },
  content: {
    key: 'content',
    label: 'is happy',
    line: 'Nice! Keep the words coming.',
  },
  happy: {
    key: 'happy',
    label: 'is thrilled',
    line: 'You hit your goal! I am so proud!',
  },
  sleepy: {
    key: 'sleepy',
    label: 'is napping',
    line: 'Zzz... wake me with a new word.',
  },
};

// Stardew-inspired retro pixel palette.
export const COLORS = {
  primary: '#C98A3B', // warm wood/amber
  primaryLight: '#E8B873',
  primaryDark: '#8C5A22',
  secondary: '#D96C6C', // barn red
  accent: '#5BA88C', // sage green
  leaf: '#7CB06A',
  leafDark: '#4E7B45',
  sky: '#8FC6E8',
  water: '#5D8FC4',
  sun: '#F2C14E',
  berry: '#B5638F',
  success: '#6BAF5A',
  warning: '#E0A02E',
  danger: '#C1584E',
  // Surfaces evoke parchment / wood UI panels
  background: '#F3E9D2',
  backgroundAlt: '#EADBBB',
  surface: '#FBF3E0',
  surfaceAlt: '#F0E2C4',
  panel: '#E8D6AE',
  text: '#4A3826',
  textLight: '#6F5A41',
  textMuted: '#A38F6F',
  // Pixel outlines are dark brown, not black, for a softer retro look
  outline: '#3A2A1A',
  outlineSoft: '#6B4E33',
  streak: '#E0742F',
};

// Pixel geometry: tiny, consistent corner radii (near-square for retro feel)
export const RADIUS = {
  sm: 2,
  md: 4,
  lg: 6,
  xl: 8,
  pill: 10,
};

export const SPACING = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 22,
  xl: 30,
};

// Hard-edged "pixel" drop shadow (offset, no blur) for the retro UI look.
export const SHADOW = {
  card: {
    shadowColor: '#3A2A1A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 0,
    elevation: 4,
  },
  soft: {
    shadowColor: '#3A2A1A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 0,
    elevation: 2,
  },
  glow: {
    shadowColor: '#3A2A1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 0,
    elevation: 6,
  },
};

// Encouraging copy shown after capturing a word (no emojis).
export const CELEBRATIONS = [
  'Nice catch!',
  'New word unlocked!',
  'You are on a roll!',
  'Sticker collected!',
  'Vocabulary up!',
  'Beautifully done!',
];

// Retro palette assigned to sticker categories (icon key + color).
// The `icon` maps to a pixel glyph rendered by PixelIcon, never an emoji.
export const CATEGORY_STYLES = {
  food: { icon: 'apple', color: '#D96C6C' },
  animal: { icon: 'paw', color: '#C98A3B' },
  object: { icon: 'box', color: '#8C7BC0' },
  nature: { icon: 'leaf', color: '#7CB06A' },
  drink: { icon: 'drop', color: '#5D8FC4' },
  clothing: { icon: 'shirt', color: '#E0A02E' },
  vehicle: { icon: 'wheel', color: '#5BA88C' },
  other: { icon: 'star', color: '#B5638F' },
};

export function getCategoryStyle(category) {
  if (!category) return CATEGORY_STYLES.other;
  const key = String(category).toLowerCase();
  return CATEGORY_STYLES[key] || CATEGORY_STYLES.other;
}
