import { ExtensionStorage } from '@bacons/apple-targets';
import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';
import {
  getPet,
  getStickers,
  getStreak,
  getUserProfile,
  getDailyWordCount,
} from './storageService';

/**
 * The home screen widget is built and working (see targets/widget/), but it is
 * switched off while we develop on a free Apple account: sharing data with a
 * widget requires the App Groups capability, and free personal teams cannot
 * provision it. Everything below stays in the repo, inert, until then.
 *
 * To turn the widget back on once the account is a paid one:
 *   1. Flip WIDGET_ENABLED to true.
 *   2. app.json -> plugins: add "@bacons/apple-targets".
 *   3. app.json -> ios.entitlements:
 *        { "com.apple.security.application-groups": [APP_GROUP] }
 *   4. Make sure APP_GROUP below matches targets/widget/expo-target.config.js.
 *   5. npx expo prebuild --platform ios --clean && npx expo run:ios
 */
const WIDGET_ENABLED = false;

// Must match the app group in targets/widget/expo-target.config.js.
export const APP_GROUP = 'group.com.xiangyudeng.capwords';
const SNAPSHOT_KEY = 'snapshot';
const WIDGET_NAME = 'CapWordsWidget';

const storage =
  WIDGET_ENABLED && Platform.OS === 'ios' ? new ExtensionStorage(APP_GROUP) : null;

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
  if (!storage) return;
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

    storage.set(SNAPSHOT_KEY, JSON.stringify(snapshot));
    ExtensionStorage.reloadWidget(WIDGET_NAME);
  } catch (error) {
    // A widget that fails to update must never break the app.
    console.warn('Widget refresh failed', error);
  }
}
