// ==================== Poop Battle ====================
// Every word learned drops one poop into the stockpile. A battle loads a
// level's worth of poops; each one is a throw, powered by a roll of five dice.
// The numbers that shape a level (ammo, monster health and attack) are derived
// from these in services/battleService.js.
export const BATTLE = {
  ammoPerWord: 1, // poops earned per word learned
  starterAmmo: 3, // a first battle's worth, so the game can be tried on day one
  diceCount: 5,
  rerolls: 2, // rerolls per throw, before outfit bonuses
  playerHealth: 100,
  critMultiplier: 2,

  // Poops a level costs to enter - which is also how many throws it gives.
  // Starts at the free tier's three words a day and grows every other level.
  ammoBase: 3,
  ammoLevelsPerStep: 2,
  ammoMax: 12,

  // Monster health per throw the level allows: what an average throw has to
  // deal. A bare buddy averages about 75 with well-chosen holds (median 63),
  // so the early levels forgive bad luck and sloppy holds, and from the late
  // teens on a level wants an outfit's bonus.
  healthPerThrowBase: 36,
  healthPerThrowGrowth: 1.8,
  healthPerThrowMax: 74,
  bossHealthMultiplier: 1.1,
  bossEvery: 5,

  // Coins: paid for a first clear, and spent to retry a lost level without
  // paying its poops again.
  winCoinsBase: 6,
  winCoinsPerLevel: 2,
  winCoinsMax: 40,
  bossCoinsBonus: 20,
  retryCoinsBase: 15,
  retryCoinsStep: 5, // added every `bossEvery` levels
  retryCoinsMax: 40,
};

// Dice hands, best first. A throw deals (sum of the dice) x multiplier.
// `id`s are matched in battleService.scoreDice.
export const DICE_COMBOS = [
  { id: 'five', name: 'Five of a kind', multiplier: 10 },
  { id: 'four', name: 'Four of a kind', multiplier: 6 },
  { id: 'fullHouse', name: 'Full house', multiplier: 4.5 },
  { id: 'straight', name: 'Straight', multiplier: 4 },
  { id: 'three', name: 'Three of a kind', multiplier: 3 },
  { id: 'twoPair', name: 'Two pair', multiplier: 2 },
  { id: 'pair', name: 'Pair', multiplier: 1.5 },
  { id: 'none', name: 'Loose poop', multiplier: 1 },
];

// Monsters, met in this order and then again in tougher colours. Sprites are
// in features/battle/monsterSprites.js under the same ids.
export const MONSTERS = [
  { id: 'slime', name: 'Goo Blob' },
  { id: 'bat', name: 'Night Flapper' },
  { id: 'shroom', name: 'Grumpy Cap' },
  { id: 'ghost', name: 'Typo Ghost' },
];

// One of these guards every `bossEvery`th level.
export const BOSSES = [
  { id: 'ogre', name: 'Grammar Ogre' },
  { id: 'dragon', name: 'Homework Dragon' },
  { id: 'demon', name: 'Lord Forgetful' },
];

// Names for each lap through the monster list.
export const MONSTER_TIERS = ['', 'Angry', 'Frozen', 'Shadow', 'Golden'];
