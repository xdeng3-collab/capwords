import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';
import SharedStore from '../../modules/shared-store';
import {
  getPet,
  getStickers,
  getStreak,
  getUserProfile,
  getDailyWordCount,
} from './storageService';

/**
 * Feeds the home screen widget. App Groups — the usual way to share a
 * container with an extension — needs a paid Apple Developer membership, so
 * the snapshot travels through a shared keychain access group instead, which
 * a free personal team can sign. See modules/shared-store.
 */
const SNAPSHOT_KEY = 'snapshot';
const WIDGET_NAME = 'CapWordsWidget';

const store = Platform.OS === 'ios' ? SharedStore : null;

/**
 * The widget extension runs in its own sandbox and cannot read the app's
 * documents folder, so the last word's photo travels as a small base64
 * thumbnail inside the shared snapshot rather than as a file path.
 */
async function buildThumbnail(imageUri) {
  if (!imageUri) return null;
  try {
    const result = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: 240 } }],
      { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    return result.base64 || null;
  } catch (error) {
    return null;
  }
}

/** Mirrors the mood logic on the Buddy screen so the widget agrees with the app. */
function moodForProgress(wordsToday, dailyGoal) {
  if (wordsToday >= dailyGoal) return 'happy';
  if (wordsToday > 0) return 'content';
  return 'neutral';
}

/**
 * Writes everything the home screen widget shows into the shared App Group
 * container and asks WidgetKit to redraw. Safe to call often — it silently
 * does nothing off iOS, and never throws into the caller.
 */
export async function refreshWidget() {
  if (!store) return;
  try {
    const [pet, stickers, streak, profile, wordsToday] = await Promise.all([
      getPet(),
      getStickers(),
      getStreak(),
      getUserProfile(),
      getDailyWordCount(),
    ]);

    const last = stickers[0] || null;
    const dailyGoal = profile?.dailyGoal ?? 5;

    const snapshot = {
      petName: pet?.name || 'Your buddy',
      species: pet?.species || 'cat',
      outfit: pet?.equippedOutfit || 'none',
      mood: moodForProgress(wordsToday, dailyGoal),
      streak: streak?.current ?? 0,
      bestStreak: streak?.longest ?? 0,
      wordsToday,
      dailyGoal,
      totalWords: stickers.length,
      lastWord: last
        ? {
            word: last.word || '',
            pronunciation: last.pronunciation || '',
            english: last.english || '',
            thumbnail: await buildThumbnail(last.imageUri),
          }
        : null,
      recentWords: stickers.slice(0, 4).map((s) => ({
        word: s.word || '',
        english: s.english || '',
      })),
    };

    store.set(SNAPSHOT_KEY, JSON.stringify(snapshot));
    store.reloadWidget(WIDGET_NAME);
  } catch (error) {
    // A widget that fails to update must never break the app.
    console.warn('Widget refresh failed', error);
  }
}
