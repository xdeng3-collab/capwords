import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadAppSettings,
  peekAppSettings,
  setAppSetting,
  subscribeAppSettings,
} from '../settingsService';

beforeEach(() => AsyncStorage.clear());

describe('app settings', () => {
  it('starts by following the iPhone, with haptics on and no AI consent yet', async () => {
    expect(await loadAppSettings()).toMatchObject({
      reduceMotion: 'system',
      hapticFeedback: true,
      aiPhotoConsent: false,
    });
  });

  it('keeps old installs working: unknown keys stay, missing ones get defaults', async () => {
    await AsyncStorage.setItem('capwords_settings', JSON.stringify({ autoSpeak: true }));
    expect(await loadAppSettings()).toMatchObject({ autoSpeak: true, reduceMotion: 'system' });
  });

  it('saves a change, makes it readable at once, and tells listeners', async () => {
    await loadAppSettings();
    const heard = jest.fn();
    const unsubscribe = subscribeAppSettings(heard);
    await setAppSetting('reduceMotion', 'on');
    expect(peekAppSettings().reduceMotion).toBe('on');
    expect(heard).toHaveBeenCalledWith(expect.objectContaining({ reduceMotion: 'on' }));
    unsubscribe();
    expect((await loadAppSettings()).reduceMotion).toBe('on');
  });
});
