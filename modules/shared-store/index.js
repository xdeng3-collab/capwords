import { requireOptionalNativeModule } from 'expo-modules-core';

/**
 * Keychain-backed store shared with the widget extension. Null on platforms or
 * builds where the native module is not present, so callers can no-op safely.
 */
const SharedStore = requireOptionalNativeModule('SharedStore');

export default SharedStore;
