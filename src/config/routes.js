/**
 * Every navigator route name, in one place.
 *
 * Screens navigate with these constants instead of string literals, so a
 * renamed route is a one-line change here and a typo fails the architecture
 * check (an unknown export) instead of silently doing nothing at runtime.
 *
 * TABS are the bottom tab bar. The rest are screens inside a tab's stack; a
 * screen that lives in another tab's stack has to be reached through that
 * tab, e.g. navigate(TABS.PROFILE, { screen: ROUTES.SUBSCRIPTION }).
 */
export const TABS = {
  BUDDY: 'Buddy',
  CAMERA: 'Camera',
  COLLECTION: 'Collection',
  FRIENDS: 'Friends',
  PROFILE: 'Profile',
};

export const ROUTES = {
  // Buddy tab
  PET_MAIN: 'PetMain',
  WARDROBE: 'Wardrobe',
  // Snap tab
  CAMERA_MAIN: 'CameraMain',
  STICKER_RESULT: 'StickerResult',
  // Book tab
  COLLECTION_MAIN: 'CollectionMain',
  STICKER_DETAIL: 'StickerDetail',
  // Pals tab
  FRIENDS_MAIN: 'FriendsMain',
  FRIEND_PROFILE: 'FriendProfile',
  // Me tab
  PROFILE_MAIN: 'ProfileMain',
  SUBSCRIPTION: 'Subscription',
  GOAL_SETTING: 'GoalSetting',
  // Shared by more than one stack
  LANGUAGE_SELECT: 'LanguageSelect',
  AUTH: 'Auth',
};
