import { requireOptionalNativeModule } from 'expo-modules-core';

/**
 * StoreKit 2 billing. Null on Android, on Expo Go, and in any build where the
 * native module is missing, so callers must degrade rather than assume.
 */
const StoreKitBilling = requireOptionalNativeModule('StoreKitBilling');

export default StoreKitBilling;
