// ==================== Coins & Outfits ====================
// Coins are earned by learning words and spent on everyday pet outfits and on
// retrying a lost Poop Battle level. Themed outfits cost real money instead.
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

// Outfit catalog. Sprites are defined in components/pixel/PetSprite.js (and
// again for the widget in targets/widget/PixelPet.swift).
//
// Where an outfit comes from decides how it is paid for:
//   coins   - everyday outfits, bought with coins earned by learning. Prices
//             assume ~25-30 coins/day: the bow is a few days of study, the
//             crown a real long-term goal.
//   battle  - limited outfits, handed over for clearing `level` in Poop Battle.
//   premium - themed sets bought with real money (`usd` is the fallback shown
//             until the App Store answers with a localised price; the product
//             ids are in pricing.js).
//
// `bonus` is what the outfit adds in battle: attack and crit are fractions
// (0.1 = +10%), health is flat, rerolls are extra rerolls per throw. `effect`
// names the trail a thrown poop leaves (features/battle/effects.js).
export const OUTFITS = [
  { id: 'none', name: 'Nothing', source: 'coins', price: 0, description: 'Just natural fluff.' },
  { id: 'bow', name: 'Ribbon Bow', source: 'coins', price: 80, description: 'A sweet little bow.' },
  {
    id: 'scarf',
    name: 'Cozy Scarf',
    source: 'coins',
    price: 160,
    description: 'Warm and stylish.',
    bonus: { health: 10 },
  },
  {
    id: 'crown',
    name: 'Royal Crown',
    source: 'coins',
    price: 600,
    description: 'Word royalty only.',
    bonus: { attack: 0.1 },
  },

  {
    id: 'headband',
    name: 'Ninja Headband',
    source: 'battle',
    level: 5,
    description: 'Won from the Grammar Ogre.',
    bonus: { attack: 0.1, crit: 0.1 },
    effect: 'ember',
  },
  {
    id: 'viking',
    name: 'Viking Helm',
    source: 'battle',
    level: 10,
    description: 'Horns of the Homework Dragon.',
    bonus: { attack: 0.15, health: 30 },
    effect: 'frost',
  },
  {
    id: 'halo',
    name: 'Golden Halo',
    source: 'battle',
    level: 15,
    description: 'Proof that Lord Forgetful fell.',
    bonus: { attack: 0.25, health: 20, rerolls: 1 },
    effect: 'gold',
  },

  {
    id: 'wizard',
    name: 'Arcane Wizard',
    theme: 'Magic',
    source: 'premium',
    usd: 1.99,
    description: 'A starry hat that bends the dice.',
    bonus: { attack: 0.3, crit: 0.15 },
    effect: 'arcane',
  },
  {
    id: 'cyber',
    name: 'Cyber Visor',
    theme: 'Tech',
    source: 'premium',
    usd: 1.99,
    description: 'Neon optics. Calculates every throw.',
    bonus: { attack: 0.2, rerolls: 1 },
    effect: 'laser',
  },
  {
    id: 'knight',
    name: 'Dragon Knight',
    theme: 'Fantasy',
    source: 'premium',
    usd: 2.99,
    description: 'Plumed helm for the bravest buddy.',
    bonus: { attack: 0.25, health: 40, crit: 0.1 },
    effect: 'inferno',
  },
];

// Outfits that were once sold and no longer exist, with what they cost.
// Anyone who owns one gets the coins back the next time the pet is read.
export const RETIRED_OUTFITS = { cap: 250 };
