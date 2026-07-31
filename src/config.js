// DeepSeek API Configuration
// API key should be set via environment variable or .env file
// Create a .env file with: DEEPSEEK_API_KEY=your_key_here
export const DEEPSEEK_API_KEY = process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY || '';
export const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1';
export const DEEPSEEK_MODEL = 'deepseek-chat'; // Flash model

// Supported languages
export const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
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

// App Theme Colors
export const COLORS = {
  primary: '#7C6BFF',
  primaryLight: '#A99BFF',
  primaryDark: '#5B4BD6',
  secondary: '#FF7BA9',
  accent: '#4ECDC4',
  mint: '#5FD9A6',
  sunny: '#FFC93C',
  peach: '#FFB088',
  sky: '#6FC8FF',
  success: '#34D399',
  warning: '#FBBF24',
  danger: '#FB7185',
  background: '#F6F5FF',
  surface: '#FFFFFF',
  surfaceAlt: '#FBFAFF',
  text: '#2B2D42',
  textLight: '#6B6F8D',
  textMuted: '#A9AEC7',
  border: '#E8E6F7',
  shadow: 'rgba(124,107,255,0.18)',
  streak: '#FF8A3D',
};

// Playful gradient pairs used across the app
export const GRADIENTS = {
  primary: ['#8B7BFF', '#6C5CE7'],
  sunset: ['#FF9A8B', '#FF6A88'],
  mint: ['#6EE7B7', '#34D399'],
  sky: ['#7DD3FC', '#38BDF8'],
  candy: ['#FDA7DF', '#D980FA'],
  sunny: ['#FFD86F', '#FC9842'],
};

// Rounded, friendly geometry
export const RADIUS = {
  sm: 12,
  md: 18,
  lg: 24,
  xl: 32,
  pill: 999,
};

export const SPACING = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 22,
  xl: 30,
};

// Soft, elevated card shadow
export const SHADOW = {
  card: {
    shadowColor: 'rgba(91,75,214,0.22)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 6,
  },
  soft: {
    shadowColor: 'rgba(91,75,214,0.14)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  glow: {
    shadowColor: 'rgba(124,107,255,0.45)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 10,
  },
};

// Encouraging copy shown after capturing a word
export const CELEBRATIONS = [
  { emoji: '🎉', text: 'Nice catch!' },
  { emoji: '✨', text: 'New word unlocked!' },
  { emoji: '🌟', text: 'You are on fire!' },
  { emoji: '🥳', text: 'Sticker collected!' },
  { emoji: '🚀', text: 'Vocabulary boost!' },
  { emoji: '💫', text: 'Beautifully done!' },
];

// Friendly pastel palette assigned to sticker categories
export const CATEGORY_STYLES = {
  food: { emoji: '🍎', color: '#FF7BA9' },
  animal: { emoji: '🐾', color: '#FFC93C' },
  object: { emoji: '📦', color: '#7C6BFF' },
  nature: { emoji: '🌿', color: '#5FD9A6' },
  drink: { emoji: '🥤', color: '#6FC8FF' },
  clothing: { emoji: '👕', color: '#FFB088' },
  vehicle: { emoji: '🚗', color: '#4ECDC4' },
  other: { emoji: '🎨', color: '#A99BFF' },
};

export function getCategoryStyle(category) {
  if (!category) return CATEGORY_STYLES.other;
  const key = String(category).toLowerCase();
  return CATEGORY_STYLES[key] || CATEGORY_STYLES.other;
}
