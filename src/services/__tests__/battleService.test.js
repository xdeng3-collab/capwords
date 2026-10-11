import AsyncStorage from '@react-native-async-storage/async-storage';
import { BATTLE, OUTFITS, PROMO_CODES } from '../../config';
import {
  addAmmo,
  ammoCostForLevel,
  enterBattle,
  finishBattle,
  getBattleState,
  getLevel,
  playerStats,
  previewDamage,
  retryWithCoins,
  rollDice,
  scoreDice,
  throwDamage,
} from '../battleService';
import { getPet } from '../petService';
import { redeemPromoCode, removePromoCode } from '../subscriptionService';
import { addCoins, getCoins } from '../walletService';

beforeEach(() => AsyncStorage.clear());

describe('dice hands', () => {
  it.each([
    ['five of a kind', [4, 4, 4, 4, 4], 'five', 20 * 10],
    ['four of a kind', [2, 2, 6, 2, 2], 'four', 14 * 6],
    ['a full house', [3, 5, 3, 5, 5], 'fullHouse', 21 * 4.5],
    ['a low straight', [5, 1, 3, 2, 4], 'straight', 15 * 4],
    ['a high straight', [2, 3, 4, 5, 6], 'straight', 20 * 4],
    ['three of a kind', [6, 6, 6, 1, 2], 'three', 21 * 3],
    ['two pair', [1, 1, 4, 4, 6], 'twoPair', 16 * 2],
    ['a pair', [1, 1, 3, 4, 6], 'pair', 15 * 1.5],
    ['nothing: five faces with a gap', [1, 2, 3, 4, 6], 'none', 16],
  ])('scores %s', (_, dice, combo, power) => {
    expect(scoreDice(dice)).toMatchObject({ combo: { id: combo }, power });
  });

  it('rerolls only the dice that are not kept', () => {
    const sixes = () => 0.99;
    expect(rollDice([], [], sixes)).toEqual([6, 6, 6, 6, 6]);
    expect(rollDice([1, 2, 3, 4, 5], [true, false, true, false, false], sixes)).toEqual([
      1, 6, 3, 6, 6,
    ]);
  });

  it('adds the outfit attack to a throw, and doubles it on a crit', () => {
    const dice = [6, 6, 6, 1, 2]; // 63 power
    const wizard = playerStats('wizard');
    expect(previewDamage(dice, playerStats('none'))).toBe(63);
    expect(previewDamage(dice, wizard)).toBe(82); // +30%
    expect(throwDamage(dice, wizard, () => 0.99)).toMatchObject({ damage: 82, crit: false });
    expect(throwDamage(dice, wizard, () => 0)).toMatchObject({
      damage: 82 * BATTLE.critMultiplier,
      crit: true,
    });
    // No crit chance, no crit - however the dice of fate land.
    expect(throwDamage(dice, playerStats('none'), () => 0).crit).toBe(false);
  });
});

describe('levels', () => {
  it('starts at what a free day of words buys, and asks for more as it climbs', () => {
    expect(ammoCostForLevel(1)).toBe(3);
    expect(ammoCostForLevel(2)).toBe(3);
    expect(ammoCostForLevel(3)).toBe(4);
    expect(ammoCostForLevel(10)).toBe(7);
    expect(ammoCostForLevel(100)).toBe(BATTLE.ammoMax);
  });

  it('never gets easier: more health and at least as many poops, level after level', () => {
    for (let level = 1; level < 60; level += 1) {
      const here = getLevel(level);
      const next = getLevel(level + 1);
      expect(next.ammoCost).toBeGreaterThanOrEqual(here.ammoCost);
      // A boss is a spike, so compare like with like.
      if (!here.boss && !next.boss) {
        expect(next.monster.health).toBeGreaterThanOrEqual(here.monster.health);
      }
    }
  });

  it('puts a boss on every fifth level, the only kind that can knock a bare buddy out', () => {
    for (let level = 1; level <= 30; level += 1) {
      const { boss, monster, ammoCost } = getLevel(level);
      expect(boss).toBe(level % 5 === 0);
      // The monster hits after every throw but the last.
      const damageTaken = monster.attack * (ammoCost - 1);
      if (boss) expect(damageTaken).toBeGreaterThanOrEqual(BATTLE.playerHealth);
      else expect(damageTaken).toBeLessThan(BATTLE.playerHealth);
    }
  });

  it('walks the roster, then brings it back in tougher colours', () => {
    expect(getLevel(1).monster).toMatchObject({ id: 'slime', name: 'Goo Blob', tier: 0 });
    expect(getLevel(5).monster).toMatchObject({ id: 'ogre', tier: 0 });
    expect(getLevel(6).monster).toMatchObject({ id: 'slime', name: 'Angry Goo Blob', tier: 1 });
    expect(getLevel(20).monster).toMatchObject({ id: 'ogre', tier: 1 });
    // Far up the ladder the tiers run out; the last one just stays.
    expect(getLevel(500).monster.tier).toBe(4);
  });

  it('hands out each limited outfit at its own level', () => {
    const rewards = OUTFITS.filter((o) => o.source === 'battle');
    expect(rewards.length).toBeGreaterThan(0);
    rewards.forEach((outfit) => expect(getLevel(outfit.level).reward).toBe(outfit));
    expect(getLevel(1).reward).toBeNull();
  });
});

describe('outfits in battle', () => {
  it('fights bare with the base numbers', () => {
    expect(playerStats('none')).toEqual({
      health: BATTLE.playerHealth,
      attack: 1,
      crit: 0,
      rerolls: BATTLE.rerolls,
      effect: 'plain',
    });
  });

  it('gives every battle reward and premium outfit a bonus and a trail of its own', () => {
    OUTFITS.filter((o) => o.source !== 'coins').forEach((outfit) => {
      const stats = playerStats(outfit.id);
      expect(stats.attack).toBeGreaterThan(1);
      expect(stats.effect).not.toBe('plain');
    });
  });
});

describe('entering and settling a fight', () => {
  it('starts everyone with enough poops for the first level', async () => {
    const state = await getBattleState();
    expect(state).toMatchObject({ ammo: BATTLE.starterAmmo, canEnter: true, paid: false });
    expect(state.level.level).toBe(1);
  });

  it('charges the level in poops once, and refuses when there are too few', async () => {
    expect(await enterBattle()).toMatchObject({ ok: true, ammo: 0 });
    // Already standing in front of the monster: walking in again is free.
    expect(await enterBattle()).toMatchObject({ ok: true, ammo: 0 });

    await finishBattle(false);
    expect(await enterBattle()).toMatchObject({ ok: false, reason: 'insufficient_ammo', ammo: 0 });
  });

  it('moves up, pays coins and cannot be claimed twice on a win', async () => {
    await enterBattle();
    const won = await finishBattle(true);
    expect(won).toMatchObject({ ok: true, won: true, coinsEarned: getLevel(1).winCoins });
    expect((await getCoins()).balance).toBe(getLevel(1).winCoins);
    expect((await getBattleState()).level.level).toBe(2);

    expect(await finishBattle(true)).toMatchObject({ ok: false, reason: 'not_entered' });
    expect((await getBattleState()).level.level).toBe(2);
  });

  it('keeps the level and the stockpile on a loss, and retries for coins alone', async () => {
    await addAmmo(2); // 5 poops; level 1 costs 3
    await enterBattle();
    expect(await finishBattle(false)).toMatchObject({ ok: true, won: false, coinsEarned: 0 });
    expect(await getBattleState()).toMatchObject({ ammo: 2, paid: false, canEnter: false });

    const { retryCoins } = getLevel(1);
    expect(await retryWithCoins()).toMatchObject({ ok: false, reason: 'insufficient_coins' });

    await addCoins(retryCoins + 1);
    expect(await retryWithCoins()).toMatchObject({ ok: true, coins: 1 });
    expect(await getBattleState()).toMatchObject({ ammo: 2, paid: true, canEnter: true });
    // The retry is the entry: it is not charged for again.
    expect(await retryWithCoins()).toMatchObject({ ok: true });
    expect((await getCoins()).balance).toBe(1);
    expect(await enterBattle()).toMatchObject({ ok: true, ammo: 2 });
  });

  it('puts the limited outfit in the closet when its level falls', async () => {
    const reward = OUTFITS.find((o) => o.source === 'battle');
    await addAmmo(500);
    let last;
    for (let level = 1; level <= reward.level; level += 1) {
      await enterBattle();
      last = await finishBattle(true);
    }
    expect(last.reward).toBe(reward);
    const pet = await getPet();
    expect(pet.ownedOutfits).toContain(reward.id);
    expect(pet.equippedOutfit).toBe('none'); // offered, not forced on
  });
});

describe('unlimited poops with a promo code', () => {
  const [code] = Object.keys(PROMO_CODES);

  it('enters any level for free and leaves the stockpile alone, until the code is removed', async () => {
    await redeemPromoCode(code);
    for (let level = 1; level <= 4; level += 1) {
      expect(await getBattleState()).toMatchObject({ unlimitedAmmo: true, canEnter: true });
      expect(await enterBattle()).toMatchObject({ ok: true, ammo: BATTLE.starterAmmo });
      await finishBattle(level % 2 === 0); // lose some, win some: still free
    }

    await removePromoCode();
    // Level 3 costs four poops and only the three starter ones are there.
    expect(await getBattleState()).toMatchObject({
      unlimitedAmmo: false,
      ammo: BATTLE.starterAmmo,
      canEnter: false,
    });
    expect(await enterBattle()).toMatchObject({ ok: false, reason: 'insufficient_ammo' });
  });
});
