import * as Linking from 'expo-linking';
import { ROUTES, TABS } from '../../config';

// The home screen widget opens capwords://camera, which lands on the Snap tab.
// An invite link, capwords://invite/ABC234, opens Invite pals; App.js has
// already kept the code for the sign-up form by the time it lands.
export const linking = {
  prefixes: [Linking.createURL('/'), 'capwords://'],
  config: {
    screens: {
      [TABS.BUDDY]: { screens: { [ROUTES.PET_MAIN]: 'buddy', [ROUTES.WARDROBE]: 'wardrobe' } },
      [TABS.CAMERA]: { screens: { [ROUTES.CAMERA_MAIN]: 'camera' } },
      [TABS.COLLECTION]: { screens: { [ROUTES.COLLECTION_MAIN]: 'book' } },
      [TABS.FRIENDS]: { screens: { [ROUTES.FRIENDS_MAIN]: 'pals' } },
      [TABS.PROFILE]: {
        screens: { [ROUTES.PROFILE_MAIN]: 'me', [ROUTES.INVITE]: 'invite/:code?' },
      },
    },
  },
};
