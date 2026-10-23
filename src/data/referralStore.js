import { STORAGE_KEYS, mergeJSON, readJSON } from './storage';

/**
 * This phone's side of invites. The rewards themselves are decided on the
 * server; this only remembers what the phone has already shown.
 *
 *   pendingCode   a pal's code waiting for this person's new account, from an
 *                 invite link or the sign-up form
 *   seenJoined    how many pals had joined with my code last time I was told
 *                 (null until the first look, so old joins are not announced)
 *   warnedFor     the invite Pro end date already warned about ("ends soon")
 *   endedFor      the invite Pro end date already announced as over
 */
const DEFAULTS = {
  pendingCode: null,
  seenJoined: null,
  warnedFor: null,
  endedFor: null,
};

export async function getReferralState() {
  return { ...DEFAULTS, ...(await readJSON(STORAGE_KEYS.REFERRAL, DEFAULTS)) };
}

export function updateReferralState(updates) {
  return mergeJSON(STORAGE_KEYS.REFERRAL, updates, DEFAULTS);
}
