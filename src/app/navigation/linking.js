import * as Linking from 'expo-linking';
import { ROUTES, TABS } from '../../config';

// The home screen widget opens capwords://camera, which lands on the Snap tab.
export const linking = {
  prefixes: [Linking.createURL('/'), 'capwords://'],
  config: {
    screens: {
      [TABS.BUDDY]: { screens: { [ROUTES.PET_MAIN]: 'buddy', [ROUTES.WARDROBE]: 'wardrobe' } },
      [TABS.CAMERA]: { screens: { [ROUTES.CAMERA_MAIN]: 'camera' } },
      [TABS.COLLECTION]: { screens: { [ROUTES.COLLECTION_MAIN]: 'book' } },
      [TABS.FRIENDS]: { screens: { [ROUTES.FRIENDS_MAIN]: 'pals' } },
      [TABS.PROFILE]: { screens: { [ROUTES.PROFILE_MAIN]: 'me' } },
    },
  },
};
