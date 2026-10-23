import AsyncStorage from '@react-native-async-storage/async-storage';
import { COINS, REVIEW } from '../../config';
import { STORAGE_KEYS } from '../../data/storage';
import {
  answerReview,
  buildQuestion,
  cardFor,
  dueStickers,
  finishReviewSession,
  getDueCount,
  getReviewSession,
  nextCard,
} from '../reviewService';
import { getCoins } from '../walletService';

jest.mock('expo-file-system', () => ({
  documentDirectory: 'file:///app/Documents/',
  makeDirectoryAsync: jest.fn(async () => {}),
  copyAsync: jest.fn(async () => {}),
  deleteAsync: jest.fn(async () => {}),
}));

// Noon UTC on 10 September 2026, day n after that.
const day = (n) => new Date(Date.UTC(2026, 8, 10 + n, 12));
const key = (n) => day(n).toISOString().slice(0, 10);

const sticker = (id, learnedOn, extra = {}) => ({
  id,
  word: id,
  language: 'es',
  createdAt: day(learnedOn).toISOString(),
  imageUri: `stickers/${id}.jpg`,
  ...extra,
});

async function keep(stickers) {
  await AsyncStorage.setItem(STORAGE_KEYS.STICKERS, JSON.stringify(stickers));
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.useFakeTimers().setSystemTime(day(0));
});

afterEach(() => jest.useRealTimers());

describe('the schedule', () => {
  it('brings a new word back the day after it was learned', () => {
    expect(cardFor(sticker('gato', 0), {})).toEqual({ box: 0, due: key(1) });
  });

  it('spaces a remembered word out box by box, up to the longest interval', () => {
    let card = { box: 0, due: key(0) };
    const gaps = [];
    for (let i = 0; i < REVIEW.intervals.length + 1; i++) {
      card = nextCard(card, true, key(0));
      gaps.push(card.box);
    }
    expect(gaps).toEqual([1, 2, 3, 4, 5, 5, 5]);
    expect(card.due).toBe(key(REVIEW.intervals[REVIEW.intervals.length - 1]));
  });

  it('sends a forgotten word back to the start, due tomorrow', () => {
    expect(nextCard({ box: 4, due: key(0) }, false, key(0))).toEqual({ box: 0, due: key(1) });
  });

  it('lists the most overdue words first and skips ones not due yet', () => {
    const stickers = [sticker('nuevo', 0), sticker('viejo', -5), sticker('medio', -2)];
    expect(dueStickers(stickers, {}, key(0)).map((s) => s.id)).toEqual(['viejo', 'medio']);
  });
});

describe('questions', () => {
  const pool = ['gato', 'perro', 'mesa', 'silla', 'taza'].map((w) => sticker(w, -1));
  const first = () => 0;

  it('offers the right word among different words in the same language', () => {
    const q = buildQuestion(pool[0], [...pool, sticker('chat', -1, { language: 'fr' })], first);
    expect(q.choices).toHaveLength(REVIEW.choices);
    expect(q.choices).toContain(pool[0]);
    expect(new Set(q.choices.map((c) => c.word)).size).toBe(REVIEW.choices);
    expect(q.choices.every((c) => c.language === 'es')).toBe(true);
  });

  it('never offers the same word twice, even from two stickers', () => {
    const twins = [pool[0], sticker('gato2', -1, { word: 'Gato' }), ...pool.slice(1, 3)];
    expect(buildQuestion(pool[0], twins, first).kind).toBe('flip');
  });

  it('asks to recall the word when there are too few others to choose from', () => {
    expect(buildQuestion(pool[0], pool.slice(0, 2), first)).toMatchObject({ kind: 'flip', choices: [] });
  });

  it('only asks to pick a photo when every choice has one', () => {
    const noPhoto = pool.map((s, i) => (i === 1 ? { ...s, imageUri: null } : s)).slice(0, 4);
    for (let i = 0; i < 10; i++) {
      expect(buildQuestion(noPhoto[0], noPhoto, Math.random).kind).toBe('photo');
    }
  });
});

describe('a session', () => {
  it('holds at most sessionSize questions and counts everything due', async () => {
    await keep(Array.from({ length: REVIEW.sessionSize + 2 }, (_, i) => sticker(`w${i}`, -3)));
    const { questions, dueCount } = await getReviewSession();
    expect(questions).toHaveLength(REVIEW.sessionSize);
    expect(dueCount).toBe(REVIEW.sessionSize + 2);
  });

  it('takes a remembered word off today\'s list', async () => {
    const gato = sticker('gato', -1);
    await keep([gato]);
    expect(await getDueCount()).toBe(1);
    await answerReview(gato, true);
    expect(await getDueCount()).toBe(0);
  });

  it('pays the review bonus once a day', async () => {
    expect(await finishReviewSession()).toEqual({ coinsEarned: COINS.reviewBonus });
    expect(await finishReviewSession()).toEqual({ coinsEarned: 0 });
    jest.setSystemTime(day(1));
    expect(await finishReviewSession()).toEqual({ coinsEarned: COINS.reviewBonus });
    expect((await getCoins()).balance).toBe(COINS.reviewBonus * 2);
  });
});
