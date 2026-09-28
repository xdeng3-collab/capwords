import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStickers } from '../collectionService';
import { recordLearnedWord } from '../learningService';
import { updateUserProfile } from '../profileService';
import { getSubscription, updateSubscription } from '../subscriptionService';

const learn = (word) =>
  recordLearnedWord({ recognition: { word, english: word }, imageUri: null, language: 'es' });

beforeEach(async () => {
  await AsyncStorage.clear();
  await updateUserProfile({ dailyGoal: 2 });
});

it('saves the sticker and charges a per-word balance', async () => {
  await updateSubscription({ type: 'per_word', wordBalance: 5 });
  const { sticker } = await learn('gato');

  expect(sticker).toMatchObject({ word: 'gato', language: 'es' });
  expect((await getStickers()).map((s) => s.word)).toEqual(['gato']);
  expect((await getSubscription()).wordBalance).toBe(4);
});

it('reports the goal only on the word that reaches it', async () => {
  const results = [await learn('uno'), await learn('dos'), await learn('tres')];
  expect(results.map((r) => r.goalJustReached)).toEqual([false, true, false]);
  expect(results.map((r) => r.streak)).toEqual([0, 1, 1]);
});
