// DeepSeek API Configuration
//
// EXPO_PUBLIC_* variables are inlined into the JavaScript bundle at build time,
// so anything set here is readable by anyone who unpacks the installed app. A
// real key therefore belongs ONLY in the proxy's environment (server/index.js,
// which reads the un-prefixed DEEPSEEK_API_KEY) - never here.
//
// This value stays supported purely as a local development shortcut for running
// against DeepSeek directly without the proxy. Leave it unset for any build you
// hand to another person.
export const DEEPSEEK_API_KEY = process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY || '';
// When EXPO_PUBLIC_API_URL is set, all AI calls go through our backend proxy
// (server/index.js) which holds the API key server-side. Direct DeepSeek
// access (key in the app bundle) is a dev-only convenience.
export const API_PROXY_URL = process.env.EXPO_PUBLIC_API_URL || '';
export const DEEPSEEK_BASE_URL = API_PROXY_URL ? `${API_PROXY_URL}/v1` : 'https://api.deepseek.com/v1';
// DeepSeek publishes exactly two model ids: 'deepseek-flash' and
// 'deepseek-v4-pro' (GET /v1/models). deepseek-flash is multimodal - it accepts
// image_url content blocks - so it serves both photo recognition and the
// text-only calls. Do not invent suffixed names like 'deepseek-v4-flash-vision-exp':
// the API quietly resolves some of them back to deepseek-flash, which hides the
// mistake until the day it stops resolving.
//
// Both models reason before answering, and those reasoning tokens are billed
// against max_tokens. A budget that is too small returns finish_reason:'length'
// with an EMPTY content string rather than an error, so every call site below
// must leave real headroom. See MIN_ANSWER_TOKENS in services/aiService.js.
export const DEEPSEEK_VISION_MODEL = 'deepseek-flash';
export const DEEPSEEK_MODEL = 'deepseek-flash';

// ==================== Supabase ====================
// Accounts, the progress mirror friends can see, and the friend graph.
// The publishable key is designed to ship inside the app bundle - Row Level
// Security (see supabase/migrations/0001_accounts.sql) is what actually keeps
// one person out of another's rows, not the secrecy of this string.
// Both empty means "no backend": the app stays fully usable on-device and the
// account screens hide themselves.
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Whether to offer "Sign in with Apple".
//
// Off by default, and it has to stay off until the Apple Developer Program
// membership is paid for. Two reasons it cannot just be detected at runtime:
// AppleAuthentication.isAvailableAsync() reports on the *device* (true on any
// iOS 13+ phone), not on whether this build carries the entitlement; and
// adding that entitlement to app.json breaks signing outright on a free
// personal team. So it is a deliberate switch, flipped alongside the other
// three steps in supabase/README.md.
export const APPLE_SIGN_IN_ENABLED = process.env.EXPO_PUBLIC_APPLE_SIGN_IN === 'true';

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
export const PRICING = {
  perWord: 0.02, // $0.02 per word
  monthly: 3.99, // $3.99/month - unlimited words
  yearly: 29.99, // $29.99/year - unlimited words (37% discount)
  freeWordsPerDay: 3, // Free tier: 3 words per day
};

// App Store product identifiers for the auto-renewing plans. These must match
// the products in storekit/CapWords.storekit during development, and the ones
// created in App Store Connect once the membership is paid.
export const IAP_PRODUCTS = {
  monthly: 'com.capwordsxxx.app.pro.monthly',
  yearly: 'com.capwordsxxx.app.pro.yearly',
};

// Reverse lookup: which plan an owned product grants.
export const PRODUCT_TO_PLAN = {
  [IAP_PRODUCTS.monthly]: 'monthly',
  [IAP_PRODUCTS.yearly]: 'yearly',
};

// Promo codes. Redeeming one grants a plan without going through billing.
// Keys must be uppercase - user input is trimmed and upper-cased before lookup.
export const PROMO_CODES = {
  CAPWORDS2026: {
    plan: 'unlimited',
    label: 'Unlimited Pro',
    message: 'Unlimited words unlocked forever. Go snap everything!',
  },
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
  checkInBonus: 5, // daily gift for visiting your buddy
  practiceBonus: 1, // practicing pronunciation of a new word
  cheerBonus: 1, // cheering a pal (per friend, per day)
  // A dedicated learner earns roughly 25-30 coins/day (words + goal bonus +
  // daily gift + practice + cheers), so packs are priced to feel like a
  // shortcut, not the only path.
  packs: [
    { id: 'coins_small', coins: 150, price: 0.99 },
    { id: 'coins_medium', coins: 450, price: 2.49 },
    { id: 'coins_large', coins: 1100, price: 4.99 },
  ],
};

// Outfit catalog. Sprites are defined in components/PetSprite.js.
// Prices assume ~25-30 coins/day of active learning: the bow is a few days
// of study, the crown a real long-term goal.
export const OUTFITS = [
  { id: 'none', name: 'Nothing', price: 0, description: 'Just natural fluff.' },
  { id: 'bow', name: 'Ribbon Bow', price: 80, description: 'A sweet little bow.' },
  { id: 'scarf', name: 'Cozy Scarf', price: 160, description: 'Warm and stylish.' },
  { id: 'cap', name: 'Snap Cap', price: 250, description: 'For sporty buddies.' },
  { id: 'crown', name: 'Royal Crown', price: 600, description: 'Word royalty only.' },
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
