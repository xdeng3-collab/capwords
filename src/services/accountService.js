import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import { APPLE_SIGN_IN_ENABLED } from '../config';
import { supabase, isSupabaseConfigured, friendlyError } from './supabase';
import {
  getCoins,
  getDailyWordCount,
  getPet,
  getStickers,
  getStreak,
  getUserProfile,
  updatePet,
  updateUserProfile,
} from './storageService';

/**
 * The user's CapWords account.
 *
 * Two rules keep this from turning the app into a thin client:
 *
 *  1. The phone is the source of truth for everything a person made - words,
 *     photos, streak, coins, the pet. Supabase holds the account and a *copy*
 *     of the numbers so pals have something to look at.
 *  2. Being signed out is a normal state, not an error. Every screen works
 *     without an account; signing in adds pals and a way back after a
 *     reinstall.
 *
 * So nothing in here throws on a network failure. Callers get
 * `{ ok, error, ... }` and decide whether it is worth interrupting anyone.
 */

const NO_BACKEND = { ok: false, error: 'Accounts are not set up in this build.' };

/**
 * Where Supabase sends people after they tap a link in an email.
 *
 * Without these the link falls back to the project's Site URL, which on a
 * fresh project is http://localhost:3000 — a dead end on a phone, and the
 * reason a confirmation email looks broken. Both URLs have to be listed under
 * Authentication -> URL Configuration -> Redirect URLs in the dashboard, or
 * Supabase refuses the redirect and sends people to the Site URL anyway.
 */
const CONFIRM_REDIRECT = 'capwords://auth-callback';
const RESET_REDIRECT = 'capwords://reset-password';

// ==================== session ====================

/** The signed-in user, or null. Cheap: reads the cached session. */
export async function getCurrentUser() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data?.user || null;
}

export async function getCurrentSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data?.session || null;
}

/**
 * Subscribe to sign-in / sign-out / token-refresh. Returns an unsubscribe.
 * Fires once immediately with the current session so a screen mounting after
 * sign-in does not sit there thinking it is signed out.
 */
export function onAuthChange(handler) {
  if (!supabase) {
    handler(null);
    return () => {};
  }
  supabase.auth.getSession().then(({ data }) => handler(data?.session || null));
  const { data } = supabase.auth.onAuthStateChange((_event, session) => handler(session));
  return () => data?.subscription?.unsubscribe();
}

// ==================== email + password ====================

export async function signUpWithEmail(email, password, displayName) {
  if (!supabase) return NO_BACKEND;

  const { data, error } = await supabase.auth.signUp({
    email: (email || '').trim(),
    password,
    options: {
      // Read by the handle_new_user trigger to seed username + display name,
      // so a brand new account already looks like a person in friend search.
      data: { display_name: (displayName || '').trim() || undefined },
      emailRedirectTo: CONFIRM_REDIRECT,
    },
  });
  if (error) return { ok: false, error: friendlyError(error) };

  // With "Confirm email" on, Supabase returns a user but no session: they
  // have to tap the link first. Tell the caller which of the two happened
  // rather than leaving it to guess from a null session.
  if (!data.session) {
    return { ok: true, needsConfirmation: true, email: (email || '').trim() };
  }

  await afterSignIn();
  return { ok: true, needsConfirmation: false };
}

export async function signInWithEmail(email, password) {
  if (!supabase) return NO_BACKEND;

  const { error } = await supabase.auth.signInWithPassword({
    email: (email || '').trim(),
    password,
  });
  if (error) return { ok: false, error: friendlyError(error) };

  await afterSignIn();
  return { ok: true };
}

/**
 * Password reset. The link in the email opens capwords://reset-password, which
 * needs the URL added to the project's redirect allow-list before it works.
 */
export async function sendPasswordReset(email) {
  if (!supabase) return NO_BACKEND;
  const { error } = await supabase.auth.resetPasswordForEmail((email || '').trim(), {
    redirectTo: RESET_REDIRECT,
  });
  if (error) return { ok: false, error: friendlyError(error) };
  return { ok: true };
}

/** Resend the confirmation email for someone stuck at the "check your inbox" step. */
export async function resendConfirmation(email) {
  if (!supabase) return NO_BACKEND;
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: (email || '').trim(),
    options: { emailRedirectTo: CONFIRM_REDIRECT },
  });
  if (error) return { ok: false, error: friendlyError(error) };
  return { ok: true };
}

// ==================== links arriving from email ====================

/**
 * Pull the parameters out of a link Supabase sent us back.
 *
 * They arrive in the query string or in the fragment depending on the flow, so
 * both halves are read and merged rather than guessed at.
 */
function linkParams(url) {
  const [, ...tail] = String(url).split(/[?#]/);
  return new URLSearchParams(tail.join('&'));
}

/**
 * Finish a confirmation or password-reset link that opened the app.
 *
 * Tapping the link in the email hits Supabase in the browser, which verifies
 * the token and bounces to capwords://…, handing back either a code to
 * exchange or the tokens themselves. Either way the session lands here and the
 * rest of the app notices through onAuthChange.
 *
 * Returns `{ handled }` so the caller can stay quiet about the many other
 * things that open the app by URL — the widget's capwords://camera, mostly.
 */
export async function completeAuthFromUrl(url) {
  if (!supabase || typeof url !== 'string') return { ok: false, handled: false };

  let params;
  try {
    params = linkParams(url);
  } catch (e) {
    return { ok: false, handled: false };
  }

  const failed = params.get('error_description') || params.get('error');
  if (failed) {
    const expired = /expired/i.test(failed) || params.get('error_code') === 'otp_expired';
    return {
      ok: false,
      handled: true,
      error: expired
        ? 'That link has expired. Tap "Send it again" for a fresh one.'
        : 'That link did not work. Try asking for a new one.',
    };
  }

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) return { ok: false, handled: true, error: friendlyError(error) };
    await afterSignIn();
    return { ok: true, handled: true };
  }

  const code = params.get('code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return { ok: false, handled: true, error: friendlyError(error) };
    await afterSignIn();
    return { ok: true, handled: true };
  }

  return { ok: false, handled: false };
}

// ==================== Sign in with Apple ====================

/**
 * Whether to draw the Apple button at all.
 *
 * Both halves matter. isAvailableAsync() answers "can this phone do it?" and
 * is true on any iOS 13+ device - it knows nothing about whether *this build*
 * carries the Sign in with Apple entitlement. On a free Apple team it does
 * not, and the sheet would fail under the user's finger. So the config flag
 * is the real gate and the device check is the sanity check.
 */
export async function isAppleSignInAvailable() {
  if (!supabase || Platform.OS !== 'ios' || !APPLE_SIGN_IN_ENABLED) return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch (e) {
    return false;
  }
}

/**
 * One tap, no password. Apple hands back a signed identity token that
 * Supabase verifies against Apple's public keys - the app never sees a
 * credential it could leak.
 *
 * The catch worth knowing: Apple sends the person's name exactly once, on the
 * very first authorisation, and never again. If we do not save it now it is
 * gone for good, so the name is written straight after sign-in.
 */
export async function signInWithApple() {
  if (!supabase) return NO_BACKEND;

  let credential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
  } catch (e) {
    // Tapping Cancel is not a failure worth an alert.
    if (e?.code === 'ERR_REQUEST_CANCELED') return { ok: false, cancelled: true };
    return {
      ok: false,
      error:
        'Sign in with Apple is not available in this build. It needs a paid Apple Developer account.',
    };
  }

  if (!credential?.identityToken) {
    return { ok: false, error: 'Apple did not return a sign-in token. Try again.' };
  }

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  });
  if (error) return { ok: false, error: friendlyError(error) };

  const appleName = [credential.fullName?.givenName, credential.fullName?.familyName]
    .filter(Boolean)
    .join(' ')
    .trim();
  await afterSignIn(appleName);
  return { ok: true };
}

// ==================== profile ====================

/**
 * The signed-in person's profile row, or null when signed out.
 *
 * Self-heals: the row is normally created by a database trigger at sign-up,
 * but if that ever misfired the account would otherwise be permanently
 * invisible to friend search, so we insert it here instead.
 */
export async function getMyProfile() {
  if (!supabase) return null;
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) return null;
  if (data) return data;

  const fallbackHandle = `capper${Math.floor(Math.random() * 1000000)}`;
  const { data: created } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      username: fallbackHandle,
      display_name: user.user_metadata?.display_name || 'CapWords User',
    })
    .select()
    .maybeSingle();

  return created || null;
}

export async function updateMyProfile(patch) {
  if (!supabase) return NO_BACKEND;
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'You are not signed in.' };

  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', user.id)
    .select()
    .maybeSingle();

  if (error) return { ok: false, error: friendlyError(error) };
  return { ok: true, profile: data };
}

/**
 * Claim a handle. Uniqueness is a database constraint, not a check-then-write
 * here, so two people racing for the same name cannot both win it.
 */
export async function setUsername(username) {
  const clean = (username || '').trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(clean)) {
    return { ok: false, error: 'Usernames need 3-20 characters: letters, numbers, or underscores.' };
  }
  return updateMyProfile({ username: clean });
}

// ==================== progress mirror ====================

/**
 * Push the numbers a pal is allowed to see. Called after a word is captured
 * and when the app comes back to the foreground.
 *
 * Silent on failure by design: nobody should get an error popup because a
 * leaderboard number is a few minutes stale.
 */
export async function pushProgress() {
  if (!supabase) return { ok: false };
  const user = await getCurrentUser();
  if (!user) return { ok: false };

  try {
    const [profile, streak, stickers, wordsToday, coins, pet] = await Promise.all([
      getUserProfile(),
      getStreak(),
      getStickers(),
      getDailyWordCount(),
      getCoins(),
      getPet(),
    ]);

    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: profile.name,
        target_language: profile.targetLanguage,
        native_language: profile.nativeLanguage,
        daily_goal: profile.dailyGoal,
        current_streak: streak.current,
        longest_streak: streak.longest,
        total_words: stickers.length,
        words_today: wordsToday,
        words_on: new Date().toISOString().split('T')[0],
        coins: coins.balance,
        pet_name: pet.name,
        pet_species: pet.species,
        pet_outfit: pet.equippedOutfit,
      })
      .eq('id', user.id);

    return { ok: !error };
  } catch (e) {
    return { ok: false };
  }
}

/**
 * Run right after a successful sign-in.
 *
 * Deliberately one-directional: it copies the *preferences* down (language,
 * daily goal, name) so a reinstall feels like coming home, and pushes the
 * numbers up. It never pulls the streak or the collection down, because the
 * phone owns those and a server copy could only ever be older.
 */
async function afterSignIn(appleName) {
  const profile = await getMyProfile();
  if (!profile) return;

  // Apple only ever tells us the name once, on first authorisation.
  if (appleName && profile.display_name === 'CapWords User') {
    await updateMyProfile({ display_name: appleName });
    profile.display_name = appleName;
  }

  await updateUserProfile({
    name: profile.display_name,
    targetLanguage: profile.target_language,
    dailyGoal: profile.daily_goal,
  });

  await pushProgress();
}

/**
 * Pull an existing account's world back down onto a fresh phone.
 *
 * The deliberate exception to the one-directional rule above, and it exists
 * for exactly one moment: someone who reinstalled and is signing in during
 * onboarding. There is nothing on this phone to lose yet, so taking the
 * server's copy of the name, language, goal, and buddy is strictly better
 * than making them pick a pet all over again.
 *
 * Never call this on a phone that already has a collection - the numbers up
 * there can only be older than the ones down here.
 */
export async function restoreFromAccount() {
  const profile = await getMyProfile();
  if (!profile) return { ok: false };

  await updateUserProfile({
    name: profile.display_name,
    targetLanguage: profile.target_language,
    dailyGoal: profile.daily_goal,
  });
  await updatePet({
    name: profile.pet_name,
    species: profile.pet_species,
    equippedOutfit: profile.pet_outfit,
    // Owning what they are wearing keeps the Wardrobe consistent; the rest of
    // the closet is re-earned, since coins are on-device currency.
    ownedOutfits: profile.pet_outfit === 'none' ? ['none'] : ['none', profile.pet_outfit],
    named: true,
  });

  return {
    ok: true,
    profile,
    targetLanguage: profile.target_language,
    dailyGoal: profile.daily_goal,
    petName: profile.pet_name,
    species: profile.pet_species,
  };
}

// ==================== sign out ====================

/**
 * Delete the account itself — the auth user, the profile, both sides of every
 * friendship, every cheer.
 *
 * Goes through the delete-account Edge Function because removing an auth user
 * needs the service role, and that key must never ship inside the app. The
 * function takes no arguments: it reads who to delete from the verified JWT,
 * so there is nothing here that could ask it to delete somebody else.
 *
 * Only the account. The words and photos on this phone are erased separately
 * by storageService.signOut - the caller does both.
 */
export async function deleteAccount() {
  if (!supabase) return NO_BACKEND;
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'You are not signed in.' };

  const { data, error } = await supabase.functions.invoke('delete-account');
  if (error) {
    // The commonest cause by far is the function not being deployed yet.
    return { ok: false, error: friendlyError(error, 'Could not delete the account.') };
  }
  if (!data?.deleted) {
    return { ok: false, error: data?.error || 'Could not delete the account.' };
  }

  // The session is already dead server-side; clear the copy in AsyncStorage
  // so the app does not start up holding a token for a user that is gone.
  await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
  return { ok: true };
}

/**
 * End the session only. The on-device collection is untouched, which is the
 * whole point of having an account: log out, log back in, everything is still
 * here. The old "log out wipes the phone" behaviour lives on as
 * storageService.signOut, which the Profile screen now offers separately as
 * an explicit erase.
 */
export async function signOutAccount() {
  if (!supabase) return { ok: true };
  const { error } = await supabase.auth.signOut();
  if (error) return { ok: false, error: friendlyError(error) };
  return { ok: true };
}

export { isSupabaseConfigured };
