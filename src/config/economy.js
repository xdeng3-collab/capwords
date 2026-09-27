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

// Outfit catalog. Sprites are defined in components/pixel/PetSprite.js.
// Prices assume ~25-30 coins/day of active learning: the bow is a few days
// of study, the crown a real long-term goal.
export const OUTFITS = [
  { id: 'none', name: 'Nothing', price: 0, description: 'Just natural fluff.' },
  { id: 'bow', name: 'Ribbon Bow', price: 80, description: 'A sweet little bow.' },
  { id: 'scarf', name: 'Cozy Scarf', price: 160, description: 'Warm and stylish.' },
  { id: 'cap', name: 'Snap Cap', price: 250, description: 'For sporty buddies.' },
  { id: 'crown', name: 'Royal Crown', price: 600, description: 'Word royalty only.' },
];
