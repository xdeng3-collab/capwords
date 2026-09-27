import 'react-native-url-polyfill/auto';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../config';

/**
 * The one Supabase client for the app.
 *
 * CapWords stays offline-first: the phone owns the collection, the streak, and
 * the pet, and Supabase holds the account, a mirror of the numbers, and the
 * friend graph. So every caller here has to survive Supabase being missing or
 * unreachable — `supabase` is null when the project is not configured, and
 * nothing in the app is allowed to crash because of it.
 */

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        // Sessions live in AsyncStorage so a returning user is already signed
        // in on launch, with no round trip and no splash-screen flicker.
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        // No browser here: there is never a session hiding in a URL bar, and
        // leaving this on makes the client reach for window.location.
        detectSessionInUrl: false,
      },
    })
  : null;

/**
 * Refresh tokens only while the app is actually on screen.
 *
 * The client's refresh timer keeps firing in the background otherwise, which
 * on iOS means a burst of failed requests every time the app is resumed after
 * a long sleep. Called once from App.js; returns an unsubscribe.
 */
export function startSessionAutoRefresh() {
  if (!supabase) return () => {};

  const apply = (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  };

  apply(AppState.currentState);
  const sub = AppState.addEventListener('change', apply);
  return () => {
    sub.remove();
    supabase.auth.stopAutoRefresh();
  };
}

/**
 * Turn whatever Supabase threw into something we can show a person.
 *
 * Auth errors arrive as machine strings ("Invalid login credentials"), and
 * Postgres constraint violations arrive as codes. Both are useless on screen.
 */
export function friendlyError(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback;
  const message = String(error.message || '');
  const code = error.code || '';

  if (code === '23505' || /duplicate key/i.test(message)) {
    return 'That username is already taken. Try another one.';
  }
  if (code === '23514' || /violates check constraint/i.test(message)) {
    return 'Usernames need 3-20 characters: letters, numbers, or underscores.';
  }
  if (/Invalid login credentials/i.test(message)) {
    return 'That email and password do not match an account.';
  }
  if (/Email not confirmed/i.test(message)) {
    return 'Check your inbox and tap the confirmation link first.';
  }
  if (/User already registered/i.test(message)) {
    return 'There is already an account with that email. Try logging in.';
  }
  if (/Password should be/i.test(message)) {
    return 'Passwords need at least 6 characters.';
  }
  if (/rate limit|too many/i.test(message)) {
    return 'Too many tries. Wait a minute and try again.';
  }
  if (/Network request failed|fetch failed/i.test(message)) {
    return 'Could not reach the server. Check your connection.';
  }
  return message || fallback;
}
