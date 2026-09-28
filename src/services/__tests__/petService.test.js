import AsyncStorage from '@react-native-async-storage/async-storage';
import { OUTFITS } from '../../config';
import { addCoins, getCoins } from '../walletService';
import { buyOutfit, derivePetMood, equipOutfit, getPet, namePet } from '../petService';

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
