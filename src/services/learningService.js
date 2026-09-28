import { pushProgress } from './accountService';
import { saveSticker } from './collectionService';
import { getUserProfile } from './profileService';
import { getDailyWordCount, getStreak } from './progressService';
import { consumeWord } from './subscriptionService';
import { refreshWidget } from './widgetService';

/**
 * "A word was learned", end to end. This is the one transaction the app
 * exists for, so it lives in one place instead of in the camera screen:
 *
 *   save the sticker (which counts the word, pays coins, moves the streak)
 *   -> charge the word against a per-word balance
 *   -> tell the widget and the pals mirror, without waiting on either
 *
 * Call it only after recognition succeeded: nothing here is undone, and a
 * failed photo must never cost a word.
 *
 * Resolves to { sticker, goalJustReached, streak }.
 */
export async function recordLearnedWord({ recognition, imageUri, language, location }) {
  const sticker = await saveSticker({
    imageUri,
    word: recognition.word,
    pronunciation: recognition.pronunciation,
    english: recognition.english,
    description: recognition.description,
    category: recognition.category,
    exampleSentence: recognition.exampleSentence,
    sentenceTranslation: recognition.sentenceTranslation,
    funFact: recognition.funFact,
    language,
    location,
  });

  await consumeWord();

  // New word, new streak, new buddy mood. Neither is awaited: a slow network
  // or a missing widget must never hold up the reward screen.
  refreshWidget();
  pushProgress();

  const [profile, wordsToday, streak] = await Promise.all([
    getUserProfile(),
    getDailyWordCount(),
    getStreak(),
  ]);

  return {
    sticker,
    // True only for the word that completes the goal, so the celebration
    // plays once a day rather than on every word after it.
    goalJustReached: wordsToday === profile.dailyGoal,
    streak: streak.current,
  };
}
