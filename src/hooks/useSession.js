import { createContext, useContext } from 'react';

/**
 * Lets a screen buried inside the tabs (Profile) hand the app back to
 * onboarding after an erase, without threading a callback through every
 * navigator. Lives in its own module so screens can reach it without importing
 * AppNavigator, which imports them.
 *
 * It also carries the signed-in Supabase user and their profile row, so that
 * one auth listener at the top serves every screen:
 *   signedOut()      - local data is gone, show onboarding again
 *   user             - the Supabase auth user, or null when signed out
 *   account          - their `profiles` row, or null
 *   refreshAccount() - re-read that row after an edit
 */
export const SessionContext = createContext({
  signedOut: () => {},
  user: null,
  account: null,
  refreshAccount: async () => null,
});

export function useSession() {
  return useContext(SessionContext);
}
