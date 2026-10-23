import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_DISPLAY_NAME } from '../../config';
import { getUserProfile, updateUserProfile } from '../profileService';

beforeEach(() => AsyncStorage.clear());

describe('profile name', () => {
  it('starts a new profile with the placeholder name', async () => {
    expect((await getUserProfile()).name).toBe(DEFAULT_DISPLAY_NAME);
  });

  it('moves a profile from before the rename onto the new placeholder', async () => {
    await AsyncStorage.setItem(
      'capwords_profile',
      JSON.stringify({ name: 'CapWords User', targetLanguage: 'fr', onboarded: true })
    );
    expect(await getUserProfile()).toMatchObject({ name: 'Voyaword User', targetLanguage: 'fr' });
    expect(JSON.parse(await AsyncStorage.getItem('capwords_profile')).name).toBe('Voyaword User');
  });

  it('never touches a name the person chose', async () => {
    await updateUserProfile({ name: 'Mia' });
    expect((await getUserProfile()).name).toBe('Mia');
  });
});
