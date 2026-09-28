import { GOAL_CHANGE_COOLDOWN_DAYS } from '../config';
import { getUserProfile, readStoredProfile, updateUserProfile } from '../data/profileStore';
import { daysBetween } from '../utils/date';
import { namePet } from './petService';

/**
 * The person using this phone: their name, language, daily goal, and whether
 * first-run setup is done. (Their online account is accountService.)
 */

export { getUserProfile, updateUserProfile };

/**
 * Whether first-run setup is done. Profiles written before onboarding existed
 * carry no flag at all - those people already have a working app, so they are
 * never sent back through it. Only an explicit `false` means "still to do".
 */
export async function hasCompletedOnboarding() {
  const profile = await readStoredProfile();
  if (!profile) return false;
  return profile.onboarded !== false;
}

/** Save every answer from onboarding in one go. */
export async function completeOnboarding({ targetLanguage, species, petName, dailyGoal, photoSource }) {
  await namePet(petName, species);
  return updateUserProfile({
    targetLanguage,
    dailyGoal,
    photoSource,
    onboarded: true,
  });
}

/** The daily goal can change once per cooldown, to keep the habit steady. */
export async function canChangeGoal() {
  const profile = await getUserProfile();
  if (!profile.lastGoalChange) return true;
  return daysBetween(profile.lastGoalChange, new Date()) >= GOAL_CHANGE_COOLDOWN_DAYS;
}
