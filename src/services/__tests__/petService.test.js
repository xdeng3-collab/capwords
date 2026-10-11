import AsyncStorage from '@react-native-async-storage/async-storage';
import { OUTFITS, RETIRED_OUTFITS } from '../../config';
import { addCoins, getCoins } from '../walletService';
import {
  buyOutfit,
  derivePetMood,
  equipOutfit,
  getPet,
  grantOutfit,
  namePet,
  updatePet,
} from '../petService';

beforeEach(() => AsyncStorage.clear());

describe('derivePetMood', () => {
  const today = '2026-09-10';
  const yesterday = '2026-09-09';
  const mood = (wordsToday, streak) =>
    derivePetMood({ wordsToday, dailyGoal: 3, streak, today, yesterday });
  const streak = (current, lastActiveDate) => ({ current, lastActiveDate });

  it.each([
    ['happy when the goal is met', 3, streak(0, null), 'happy'],
    ['content with some words today', 1, streak(0, null), 'content'],
    ['sleepy before the first word, streak alive', 0, streak(4, yesterday), 'sleepy'],
    ['sleepy on a fresh install', 0, streak(0, null), 'sleepy'],
    ['sad when a streak was left behind', 0, streak(4, '2026-09-01'), 'sad'],
  ])('is %s', (_, wordsToday, s, expected) => {
    expect(mood(wordsToday, s)).toBe(expected);
  });
});

describe('wardrobe', () => {
  const outfit = OUTFITS.find((o) => o.price > 0);

  it('refuses when there are not enough coins, and charges nothing', async () => {
    await addCoins(outfit.price - 1);
    expect(await buyOutfit(outfit.id)).toMatchObject({ ok: false, reason: 'insufficient_coins' });
    expect((await getCoins()).balance).toBe(outfit.price - 1);
  });

  it('charges once, owns and equips on purchase, and will not sell it twice', async () => {
    await addCoins(outfit.price * 2);
    expect((await buyOutfit(outfit.id)).ok).toBe(true);
    expect(await getPet()).toMatchObject({ equippedOutfit: outfit.id });
    expect((await getPet()).ownedOutfits).toContain(outfit.id);

    expect(await buyOutfit(outfit.id)).toMatchObject({ ok: false, reason: 'owned' });
    expect((await getCoins()).balance).toBe(outfit.price);
  });

  it('only equips outfits that are owned', async () => {
    await equipOutfit(outfit.id);
    expect((await getPet()).equippedOutfit).toBe('none');
  });
});

describe('outfits that coins cannot buy', () => {
  it.each(OUTFITS.filter((o) => o.source !== 'coins').map((o) => [o.name, o.id]))(
    'will not sell the %s for coins',
    async (_, id) => {
      await addCoins(100000);
      expect(await buyOutfit(id)).toMatchObject({ ok: false, reason: 'not_for_coins' });
      expect((await getCoins()).balance).toBe(100000);
      expect((await getPet()).ownedOutfits).not.toContain(id);
    }
  );

  it('grants one for free, once, without putting it on', async () => {
    const reward = OUTFITS.find((o) => o.source === 'battle');
    await grantOutfit(reward.id);
    await grantOutfit(reward.id);
    const pet = await getPet();
    expect(pet.ownedOutfits.filter((id) => id === reward.id)).toHaveLength(1);
    expect(pet.equippedOutfit).toBe('none');

    await grantOutfit('not-an-outfit');
    expect((await getPet()).ownedOutfits).not.toContain('not-an-outfit');
  });
});

describe('retired outfits', () => {
  it('takes the Snap Cap back and refunds it, once', async () => {
    await updatePet({ ownedOutfits: ['none', 'bow', 'cap'], equippedOutfit: 'cap' });

    // Screens read the pet in parallel; the refund must not multiply.
    const [pet] = await Promise.all([getPet(), getPet(), getPet()]);
    expect(pet).toMatchObject({ ownedOutfits: ['none', 'bow'], equippedOutfit: 'none' });
    expect((await getCoins()).balance).toBe(RETIRED_OUTFITS.cap);

    await getPet();
    expect((await getCoins()).balance).toBe(RETIRED_OUTFITS.cap);
  });

  it('is gone from the catalog', () => {
    expect(OUTFITS.some((o) => o.id in RETIRED_OUTFITS)).toBe(false);
  });
});

describe('namePet', () => {
  it('trims, caps the length, and ignores a blank name', async () => {
    await namePet('   ');
    expect((await getPet()).named).toBe(false);

    await namePet('  A-very-long-buddy-name  ', 'dog');
    const pet = await getPet();
    expect(pet.name).toBe('A-very-long-');
    expect(pet).toMatchObject({ named: true, species: 'dog' });
  });
});
