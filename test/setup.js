/* eslint-env jest */
// In-memory AsyncStorage, shipped by the library for exactly this.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// The app's own native modules resolve to null wherever they are not built
// in (Expo Go, Android), and every caller already handles that - so tests run
// against exactly that "not available" case.
jest.mock('../modules/store-kit', () => ({ __esModule: true, default: null }));
jest.mock('../modules/shared-store', () => ({ __esModule: true, default: null }));
