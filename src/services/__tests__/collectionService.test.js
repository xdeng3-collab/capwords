import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../../data/storage';
import { deleteSticker, getStickers, getStickersByDate } from '../collectionService';
import { removeDemoData } from '../deviceDataService';

// A real-looking documents folder, so stored (relative) and resolved
// (absolute) photo paths differ the way they do on a phone.
jest.mock('expo-file-system', () => ({
  documentDirectory: 'file:///app/Documents/',
  makeDirectoryAsync: jest.fn(async () => {}),
  copyAsync: jest.fn(async () => {}),
  deleteAsync: jest.fn(async () => {}),
}));

const sticker = (id, createdAt, extra = {}) => ({ id, word: id, createdAt, ...extra });

beforeEach(() => AsyncStorage.clear());

it('groups the book by local day, not UTC day', async () => {
  // Tests run in Asia/Shanghai (UTC+8): 23:30 UTC on the 27th is 07:30 on the 28th.
  await AsyncStorage.setItem(
    STORAGE_KEYS.STICKERS,
    JSON.stringify([
      sticker('morning', '2026-09-27T23:30:00.000Z'),
      sticker('evening', '2026-09-27T12:00:00.000Z'),
    ])
  );
  const groups = await getStickersByDate();
  expect(groups.map((g) => [g.date, g.items.map((s) => s.id)])).toEqual([
    ['2026-09-28', ['morning']],
    ['2026-09-27', ['evening']],
  ]);
});

it('hands screens absolute photo URIs', async () => {
  await AsyncStorage.setItem(
    STORAGE_KEYS.STICKERS,
    JSON.stringify([sticker('a', '2026-09-27T12:00:00.000Z', { imageUri: 'stickers/a.jpg' })])
  );
  expect((await getStickers())[0].imageUri).toBe('file:///app/Documents/stickers/a.jpg');
});

it('deletes only the chosen sticker', async () => {
  await AsyncStorage.setItem(
    STORAGE_KEYS.STICKERS,
    JSON.stringify([sticker('a', '2026-09-27T12:00:00.000Z'), sticker('b', '2026-09-27T12:00:00.000Z')])
  );
  await deleteSticker('a');
  expect((await getStickers()).map((s) => s.id)).toEqual(['b']);
});

it('sweeps demo stickers and keeps stored photo paths relative', async () => {
  await AsyncStorage.setItem(
    STORAGE_KEYS.STICKERS,
    JSON.stringify([
      sticker('demo_1', '2026-09-27T12:00:00.000Z'),
      sticker('real', '2026-09-27T12:00:00.000Z', { imageUri: 'stickers/real.jpg' }),
    ])
  );
  await AsyncStorage.setItem(STORAGE_KEYS.FRIENDS, '[]');

  await removeDemoData();

  const stored = JSON.parse(await AsyncStorage.getItem(STORAGE_KEYS.STICKERS));
  expect(stored).toEqual([expect.objectContaining({ id: 'real', imageUri: 'stickers/real.jpg' })]);
  expect(await AsyncStorage.getItem(STORAGE_KEYS.FRIENDS)).toBeNull();
});
