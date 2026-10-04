const { withEntitlementsPlist } = require('@expo/config-plugins');

/**
 * Expo config plugin: keep the "Sign in with Apple" entitlement out of the
 * build unless the feature is switched on.
 *
 * Expo applies expo-apple-authentication's own config plugin whenever the
 * package is installed, whether or not it is listed under `plugins` (it is one
 * of the "versioned" SDK plugins in @expo/prebuild-config). That plugin adds
 * `com.apple.developer.applesignin` to the app's entitlements.
 *
 * The team A59BMF9Y7J is a free personal team, and free teams cannot sign an
 * app that carries that entitlement: device builds fail with "Personal
 * development teams ... do not support the Sign In with Apple capability".
 * Simulator builds do not check, which is how it went unnoticed.
 *
 * So the entitlement follows the same flag the app reads at runtime
 * (src/config/env.js): it is only kept when EXPO_PUBLIC_APPLE_SIGN_IN=true.
 * See supabase/README.md, "Sign in with Apple".
 */

const ENTITLEMENT = 'com.apple.developer.applesignin';

module.exports = function withoutAppleSignInEntitlement(config) {
  return withEntitlementsPlist(config, (cfg) => {
    if (process.env.EXPO_PUBLIC_APPLE_SIGN_IN !== 'true') {
      delete cfg.modResults[ENTITLEMENT];
    }
    return cfg;
  });
};
