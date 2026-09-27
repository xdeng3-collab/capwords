import { DEFAULT_DAILY_GOAL } from '../config';
import { STORAGE_KEYS, readJSON, writeJSON } from './storage';

function defaultProfile() {
  return {
    id: Date.now().toString(),
    name: 'CapWords User',
    avatar: null,
    targetLanguage: 'es',
    nativeLanguage: 'en',
    dailyGoal: DEFAULT_DAILY_GOAL,
    lastGoalChange: null,
    // How onboarding said they want to add photos: 'camera' or 'library'.
    // Library-only people are never asked for the camera until they reach
    // for the shutter themselves.
    photoSource: 'camera',
    // First-run setup has not run yet on a brand new profile.
    onboarded: false,
    joinDate: new Date().toISOString(),
  };
}

/** The profile as stored, or null on a fresh install. Never creates one. */
export function readStoredProfile() {
  return readJSON(STORAGE_KEYS.USER_PROFILE, null);
}

/** The local profile, created with defaults on first read. */
export async function getUserProfile() {
  const stored = await readStoredProfile();
  if (stored) return stored;
  return writeJSON(STORAGE_KEYS.USER_PROFILE, defaultProfile());
}

export async function updateUserProfile(updates) {
  const profile = await getUserProfile();
  return writeJSON(STORAGE_KEYS.USER_PROFILE, { ...profile, ...updates });
}
