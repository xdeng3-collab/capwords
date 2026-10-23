import { COINS, REVIEW } from '../config';
import { getReviewState, saveReviewState } from '../data/reviewStore';
import { addCoins } from '../data/walletStore';
import { dayKey, shiftDayKey, todayKey } from '../utils/date';
import { getStickers } from './collectionService';

/**
 * Bringing learned words back so they stick (REVIEW in config/review.js).
 *
 * The pure functions below hold the rules; the async ones at the bottom read
 * and save. A sticker deleted from My Words simply stops coming up: its card
 * is ignored rather than cleaned up.
 */

/** A sticker's schedule: its saved card, or box 0 due the day after it was learned. */
export function cardFor(sticker, cards) {
  if (cards[sticker.id]) return cards[sticker.id];
  const learned = sticker.createdAt ? dayKey(new Date(sticker.createdAt)) : todayKey();
  return { box: 0, due: shiftDayKey(learned, REVIEW.intervals[0]) };
}

/** Stickers due on or before `today`, most overdue first, at most `limit`. */
export function dueStickers(stickers, cards, today, limit = Infinity) {
  return stickers
    .filter((s) => s.word && cardFor(s, cards).due <= today)
    .sort((a, b) => {
      const byDue = cardFor(a, cards).due.localeCompare(cardFor(b, cards).due);
      return byDue || String(a.createdAt).localeCompare(String(b.createdAt));
    })
    .slice(0, limit);
}

/** The card after an answer given on `today`. */
export function nextCard(card, remembered, today) {
  if (!remembered) return { box: 0, due: shiftDayKey(today, REVIEW.intervals[0]) };
  const box = Math.min(card.box + 1, REVIEW.intervals.length - 1);
  return { box, due: shiftDayKey(today, REVIEW.intervals[box]) };
}

function shuffle(items, random) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * One question about `sticker`, with wrong answers drawn from `pool` (other
 * stickers in the same language, each a different word).
 *
 *   'photo'  see the photo, pick the word
 *   'listen' hear the word, pick the photo (every choice needs a photo)
 *   'flip'   see the photo, recall the word, then say whether you knew it -
 *            used when there are not enough other words to choose from
 */
export function buildQuestion(sticker, pool, random = Math.random) {
  const seen = new Set([sticker.word.toLowerCase()]);
  const others = [];
  for (const s of shuffle(pool, random)) {
    if (s.id === sticker.id || s.language !== sticker.language || !s.word) continue;
    const key = s.word.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    others.push(s);
    if (others.length === REVIEW.choices - 1) break;
  }

  if (others.length < REVIEW.choices - 1) return { kind: 'flip', sticker, choices: [] };

  const choices = shuffle([sticker, ...others], random);
  const canListen = choices.every((c) => c.imageUri);
  const kind = canListen && random() < 0.5 ? 'listen' : 'photo';
  return { kind, sticker, choices };
}

// ==================== reading and saving ====================

/** How many words are waiting to be reviewed today. */
export async function getDueCount() {
  const [stickers, { cards }] = await Promise.all([getStickers(), getReviewState()]);
  return dueStickers(stickers, cards, todayKey()).length;
}

/** Today's session: { questions, dueCount }. */
export async function getReviewSession() {
  const [stickers, { cards }] = await Promise.all([getStickers(), getReviewState()]);
  const due = dueStickers(stickers, cards, todayKey());
  const questions = due.slice(0, REVIEW.sessionSize).map((s) => buildQuestion(s, stickers));
  return { questions, dueCount: due.length };
}

/** Record whether the word on `sticker` was remembered. */
export async function answerReview(sticker, remembered) {
  const state = await getReviewState();
  const card = nextCard(cardFor(sticker, state.cards), remembered, todayKey());
  await saveReviewState({ ...state, cards: { ...state.cards, [sticker.id]: card } });
  return card;
}

/**
 * A session was finished. Pays COINS.reviewBonus the first time each day.
 * Returns { coinsEarned }.
 */
export async function finishReviewSession() {
  const today = todayKey();
  const state = await getReviewState();
  if (state.rewardDay === today) return { coinsEarned: 0 };
  await saveReviewState({ ...state, rewardDay: today });
  await addCoins(COINS.reviewBonus);
  return { coinsEarned: COINS.reviewBonus };
}
