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
  primary: '#6C63FF',
  primaryLight: '#8B85FF',
  primaryDark: '#4A42E0',
  secondary: '#FF6B6B',
  accent: '#4ECDC4',
  success: '#2ECC71',
  warning: '#F39C12',
  background: '#F8F9FA',
  surface: '#FFFFFF',
  text: '#2D3436',
  textLight: '#636E72',
  textMuted: '#B2BEC3',
  border: '#DFE6E9',
  shadow: 'rgba(0,0,0,0.1)',
  streak: '#FF9800',
};
