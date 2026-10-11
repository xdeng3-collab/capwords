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

// One-time (non-consumable) purchases: premium outfits, keyed by outfit id.
export const IAP_OUTFITS = {
  wizard: 'com.capwordsxxx.app.outfit.wizard',
  cyber: 'com.capwordsxxx.app.outfit.cyber',
  knight: 'com.capwordsxxx.app.outfit.knight',
};

// Promo codes. Redeeming one grants a plan without going through billing.
// The 'unlimited' plan lifts the daily word limit and makes Poop Battle free to
// enter, however many poops are in the stockpile. A code can be removed again
// from the Subscription screen, which puts the account back on the free plan.
// Keys must be uppercase - user input is trimmed and upper-cased before lookup.
export const PROMO_CODES = {
  CAPWORDS2026: {
    plan: 'unlimited',
    label: 'Unlimited Pro',
    message: 'Unlimited words and unlimited battle poops unlocked. Go snap everything!',
  },
};
