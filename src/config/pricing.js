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
