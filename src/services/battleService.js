import { BATTLE, BOSSES, DICE_COMBOS, MONSTERS, MONSTER_TIERS, OUTFITS } from '../config';
import { addAmmo, getBattle, updateBattle } from '../data/battleStore';
import { getPet } from '../data/petStore';
import { addCoins, getCoins, spendCoins } from '../data/walletStore';
import { grantOutfit } from './petService';
import { hasUnlimitedAmmo } from './subscriptionService';

/**
 * Poop Battle: the words someone learns become poops, and poops are thrown at
 * monsters up an endless ladder of levels.
 *
 * The first half of this file is the rulebook as pure functions - what a level
 * looks like, what an outfit adds, what a roll is worth - so the screen and the
 * tests agree on every number. The second half is what gets saved: the
 * stockpile, the ladder, and who has paid to stand in front of which monster.
 */

export { addAmmo };

// ==================== Levels ====================

export function isBossLevel(level) {
  return level % BATTLE.bossEvery === 0;
}

/** Poops a level costs to enter, which is also how many throws it allows. */
export function ammoCostForLevel(level) {
  const steps = Math.floor((level - 1) / BATTLE.ammoLevelsPerStep);
  return Math.min(BATTLE.ammoBase + steps, BATTLE.ammoMax);
}

function monsterForLevel(level) {
  const boss = isBossLevel(level);
  const roster = boss ? BOSSES : MONSTERS;
  // How many monsters of this kind came before this one.
  const bossesBefore = Math.floor((level - 1) / BATTLE.bossEvery);
  const seen = boss ? bossesBefore : level - 1 - bossesBefore;
  const kind = roster[seen % roster.length];
  const tier = Math.min(Math.floor(seen / roster.length), MONSTER_TIERS.length - 1);
  const prefix = MONSTER_TIERS[tier];
  return { id: kind.id, name: prefix ? `${prefix} ${kind.name}` : kind.name, tier };
}

/** The outfit handed over for clearing `level`, if it has one. */
export function rewardForLevel(level) {
  return OUTFITS.find((o) => o.source === 'battle' && o.level === level) || null;
}

/** The next limited outfit still ahead of someone who has cleared `highestCleared`. */
export function nextReward(highestCleared) {
  return (
    OUTFITS.filter((o) => o.source === 'battle' && o.level > highestCleared).sort(
      (a, b) => a.level - b.level
    )[0] || null
  );
}

/**
 * Everything about one level: who is waiting, how hard they hit, what it
 * costs to walk in and what there is to win.
 */
export function getLevel(level) {
  const boss = isBossLevel(level);
  const throws = ammoCostForLevel(level);

  const perThrow = Math.min(
    BATTLE.healthPerThrowBase + BATTLE.healthPerThrowGrowth * (level - 1),
    BATTLE.healthPerThrowMax
  );
  const health = Math.round(throws * perThrow * (boss ? BATTLE.bossHealthMultiplier : 1));

  // The monster hits back after every throw that leaves it standing, so a
  // level of T throws has at most T-1 hits to take. An ordinary monster cannot
  // finish a bare buddy in that time: running out of poops is what loses the
  // level. A boss can, on its last hit - unless an outfit adds some health.
  const attack = boss
    ? Math.ceil(BATTLE.playerHealth / (throws - 1))
    : Math.floor(BATTLE.playerHealth / (throws + 2));

  const steps = Math.floor((level - 1) / BATTLE.bossEvery);
  return {
    level,
    boss,
    monster: { ...monsterForLevel(level), health, attack },
    ammoCost: throws,
    winCoins:
      Math.min(BATTLE.winCoinsBase + BATTLE.winCoinsPerLevel * level, BATTLE.winCoinsMax) +
      (boss ? BATTLE.bossCoinsBonus : 0),
    retryCoins: Math.min(
      BATTLE.retryCoinsBase + BATTLE.retryCoinsStep * steps,
      BATTLE.retryCoinsMax
    ),
    reward: rewardForLevel(level),
  };
}

// ==================== The buddy in battle ====================

/** What the buddy brings to a fight wearing `outfitId`. */
export function playerStats(outfitId) {
  const outfit = OUTFITS.find((o) => o.id === outfitId);
  const bonus = outfit?.bonus || {};
  return {
    health: BATTLE.playerHealth + (bonus.health || 0),
    attack: 1 + (bonus.attack || 0),
    crit: bonus.crit || 0,
    rerolls: BATTLE.rerolls + (bonus.rerolls || 0),
    effect: outfit?.effect || 'plain',
  };
}

// ==================== Dice ====================

const rollDie = (rng) => 1 + Math.floor(rng() * 6);

/** A fresh roll, keeping the dice whose index is true in `held`. */
export function rollDice(dice = [], held = [], rng = Math.random) {
  return Array.from({ length: BATTLE.diceCount }, (_, i) =>
    held[i] && dice[i] ? dice[i] : rollDie(rng)
  );
}

function comboIdFor(dice) {
  const counts = {};
  dice.forEach((d) => {
    counts[d] = (counts[d] || 0) + 1;
  });
  const groups = Object.values(counts).sort((a, b) => b - a);
  const faces = Object.keys(counts).map(Number);

  if (groups[0] === 5) return 'five';
  if (groups[0] === 4) return 'four';
  if (groups[0] === 3 && groups[1] === 2) return 'fullHouse';
  // Five different faces are a run exactly when they span four.
  if (groups.length === 5 && Math.max(...faces) - Math.min(...faces) === 4) return 'straight';
  if (groups[0] === 3) return 'three';
  if (groups[0] === 2 && groups[1] === 2) return 'twoPair';
  if (groups[0] === 2) return 'pair';
  return 'none';
}

/** The hand five dice make: { combo, sum, power } where power = sum x multiplier. */
export function scoreDice(dice) {
  const id = comboIdFor(dice);
  const combo = DICE_COMBOS.find((c) => c.id === id);
  const sum = dice.reduce((total, d) => total + d, 0);
  return { combo, sum, power: sum * combo.multiplier };
}

/** Damage the hand does before luck: what the screen shows while choosing. */
export function previewDamage(dice, stats) {
  return Math.round(scoreDice(dice).power * stats.attack);
}

/** Throw the poop. Returns { damage, crit, combo }. */
export function throwDamage(dice, stats, rng = Math.random) {
  const { combo } = scoreDice(dice);
  const crit = stats.crit > 0 && rng() < stats.crit;
  const damage = previewDamage(dice, stats) * (crit ? BATTLE.critMultiplier : 1);
  return { damage, crit, combo };
}

// ==================== Saved progress ====================

/** Everything the battle screen needs before a fight, in one read. */
export async function getBattleState() {
  const [battle, pet, coins, unlimitedAmmo] = await Promise.all([
    getBattle(),
    getPet(),
    getCoins(),
    hasUnlimitedAmmo(),
  ]);
  const level = getLevel(battle.highestCleared + 1);
  const paid = battle.paidLevel === level.level;
  return {
    level,
    paid,
    ammo: battle.ammo,
    unlimitedAmmo,
    canEnter: paid || unlimitedAmmo || battle.ammo >= level.ammoCost,
    highestCleared: battle.highestCleared,
    coins: coins.balance,
    pet: { name: pet.name, species: pet.species, outfit: pet.equippedOutfit },
    stats: playerStats(pet.equippedOutfit),
    nextReward: nextReward(battle.highestCleared),
  };
}

/**
 * Walk into the next level, paying its poops unless the entry is already
 * paid for or a promo code makes poops unlimited (the stockpile is then left
 * as it is). Returns { ok, reason, level, ammo }.
 */
export async function enterBattle() {
  const battle = await getBattle();
  const level = getLevel(battle.highestCleared + 1);
  if (battle.paidLevel === level.level) return { ok: true, level, ammo: battle.ammo };
  if (await hasUnlimitedAmmo()) {
    await updateBattle({ paidLevel: level.level });
    return { ok: true, level, ammo: battle.ammo };
  }
  if (battle.ammo < level.ammoCost) {
    return { ok: false, reason: 'insufficient_ammo', level, ammo: battle.ammo };
  }
  const updated = await updateBattle({
    ammo: battle.ammo - level.ammoCost,
    paidLevel: level.level,
  });
  return { ok: true, level, ammo: updated.ammo };
}

/**
 * Settle the fight that was entered. A win moves up the ladder, pays coins and
 * hands over the level's outfit; a loss only uses up the entry. Settling a
 * level that was never entered does nothing, so a win cannot be claimed twice.
 * Returns { ok, won, coinsEarned, reward }.
 */
export async function finishBattle(won) {
  const battle = await getBattle();
  const level = getLevel(battle.highestCleared + 1);
  if (battle.paidLevel !== level.level) return { ok: false, reason: 'not_entered' };

  if (!won) {
    await updateBattle({ paidLevel: null, losses: battle.losses + 1 });
    return { ok: true, won: false, coinsEarned: 0, reward: null };
  }

  await updateBattle({
    paidLevel: null,
    highestCleared: level.level,
    wins: battle.wins + 1,
  });
  await addCoins(level.winCoins);
  if (level.reward) await grantOutfit(level.reward.id);
  return { ok: true, won: true, coinsEarned: level.winCoins, reward: level.reward };
}

/**
 * After a loss: pay coins to stand in front of the same monster again, without
 * touching the stockpile. Returns { ok, reason, level, coins }.
 */
export async function retryWithCoins() {
  const battle = await getBattle();
  const level = getLevel(battle.highestCleared + 1);
  if (battle.paidLevel === level.level) return { ok: true, level };

  const coins = await spendCoins(level.retryCoins);
  if (!coins) return { ok: false, reason: 'insufficient_coins', level };
  await updateBattle({ paidLevel: level.level });
  return { ok: true, level, coins: coins.balance };
}
