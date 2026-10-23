import { Platform } from 'react-native';
import SharedStore from '../../modules/shared-store';
import { APP_LINKS, PRICING, REFERRAL } from '../config';
import { friendlyError, supabase } from '../api/supabaseClient';
import { getInstallId } from '../data/installStore';
import { getReferralState, updateReferralState } from '../data/referralStore';
import { getCurrentUser } from './accountService';
import {
  getSubscription,
  hasPaidPlan,
  hasReferralPro,
  setReferralProUntil,
} from './subscriptionService';

/**
 * Invite a pal: someone new signs up with your code and you both get
 * REFERRAL.rewardDays of Pro.
 *
 * The server decides everything that matters - whether the code is real,
 * whether the account and the phone are new, how many days each person has
 * earned (supabase/migrations/*_referrals.sql). This side carries a code from
 * a link or the sign-up form to the new account, keeps a copy of the end date
 * so the daily limit lifts offline too, and works out what to tell people.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

// Same alphabet as the server: no 0/O or 1/I.
const CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;

// ==================== codes ====================

/** A code as the server stores it, from whatever was typed or pasted; null if it cannot be one. */
export function parseInviteCode(text) {
  const clean = String(text || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  return CODE_PATTERN.test(clean) ? clean : null;
}

/** The code in an invite link (capwords://invite/ABC234 or …?invite=ABC234), or null. */
export function inviteCodeFromUrl(url) {
  const match = /(?:\/\/|\/)invite(?:\/|\?code=)([A-Za-z0-9-]+)|[?&]invite=([A-Za-z0-9-]+)/.exec(
    String(url || '')
  );
  return match ? parseInviteCode(match[1] || match[2]) : null;
}

/**
 * Hold on to the code from an invite link until there is an account to use it
 * on. Called for every URL that opens the app; anything else is ignored.
 */
export async function rememberInviteFromUrl(url) {
  const code = inviteCodeFromUrl(url);
  if (code) await updateReferralState({ pendingCode: code });
  return code;
}

export async function getPendingInviteCode() {
  return (await getReferralState()).pendingCode;
}

export function setPendingInviteCode(code) {
  return updateReferralState({ pendingCode: parseInviteCode(code) });
}

/** What to send a pal. */
export function buildInviteMessage(code) {
  const lines = [
    `Learn words with me on Voyaword! Snap a photo of anything and learn its name in another language.`,
    `Sign up with my invite code ${code} and we both get ${REFERRAL.rewardDays} days of Pro.`,
  ];
  if (APP_LINKS.download) lines.push(APP_LINKS.download);
  return lines.join('\n\n');
}

// ==================== this phone ====================

const DEVICE_KEY = 'device_marker';
const keychain = Platform.OS === 'ios' ? SharedStore : null;

function randomMarker() {
  let id = '';
  for (let i = 0; i < 32; i++) id += Math.floor(Math.random() * 16).toString(16);
  return id;
}

/**
 * A random marker for this phone, so the server can tell a new pal from a
 * second account made on the same phone. Kept in the keychain, which outlives
 * a reinstall and "Erase everything"; where there is no keychain it falls back
 * to the install id, which does not. Not tied to the hardware or the person,
 * and the server only ever stores a hash of it.
 */
export async function getDeviceMarker() {
  if (keychain) {
    try {
      const saved = keychain.get(DEVICE_KEY);
      if (saved) return saved;
      const fresh = randomMarker();
      if (keychain.set(DEVICE_KEY, fresh)) return fresh;
    } catch (e) {
      // No keychain group in this build: fall through.
    }
  }
  return getInstallId();
}

// ==================== status and redeeming ====================

/** Days left until `until`, rounded up; 0 once it has passed. */
export function daysLeft(until, now = new Date()) {
  if (!until) return 0;
  return Math.max(0, Math.ceil((new Date(until) - now) / DAY_MS));
}

function toStatus(row) {
  return {
    code: row?.code || null,
    invited: Boolean(row?.invited),
    invitedBy: row?.invitedBy || null,
    canRedeem: Boolean(row?.canRedeem),
    palsJoined: Number(row?.palsJoined) || 0,
    proUntil: row?.proUntil || null,
  };
}

/**
 * My code, who invited me, how many pals joined, and when my invite Pro ends.
 * Also stores that end date on the phone. Returns { ok, signedOut?, ...status }.
 *
 * A paying member also sends the dates of the current App Store period, and
 * the server lays their invite days out after it: invite Pro becomes a longer
 * membership instead of running out underneath one.
 */
export async function getReferralStatus() {
  if (!supabase) return { ok: false, error: 'Accounts are not set up in this build.' };
  const user = await getCurrentUser();
  if (!user) return { ok: false, signedOut: true };

  const [device, sub] = await Promise.all([getDeviceMarker(), getSubscription()]);
  const args = { p_device: device };
  if (hasPaidPlan(sub) && sub.periodStart) {
    args.p_paid_from = sub.periodStart;
    args.p_paid_until = sub.expiresAt;
  }

  let { data, error } = await supabase.rpc('referral_status', args);
  // A database without the paid-period migration only knows the one-argument
  // version, and PostgREST finds no function for three. Ask the old way.
  if (error && args.p_paid_from && error.code === 'PGRST202') {
    ({ data, error } = await supabase.rpc('referral_status', { p_device: device }));
  }
  if (error) return { ok: false, error: friendlyError(error) };

  const status = toStatus(data);
  await setReferralProUntil(status.proUntil);
  return { ok: true, ...status };
}

const MESSAGES = {
  bad_code: "That code doesn't match anyone. Check it and try again.",
  self: "That's your own code. Send it to a pal instead!",
  already_invited: "You've already joined with a pal's code.",
  too_late: `Invite codes work within ${REFERRAL.redeemWindowDays} days of making an account.`,
  device_used:
    "Invite codes are for new pals, and this phone has already been used with another Voyaword account.",
  no_device: "Couldn't check this phone. Try again in a moment.",
};

/** What to show for a redeem outcome. */
export function describeRedeem({ status, inviterName }) {
  if (status === 'ok') {
    const who = inviterName ? `You and ${inviterName}` : 'You and your pal';
    return `${who} both get ${REFERRAL.rewardDays} days of Pro. You're pals now, too!`;
  }
  return MESSAGES[status] || 'Something went wrong. Please try again.';
}

/**
 * Join with a pal's code. Returns { ok, status, message, inviterName?, proUntil? }.
 * `status` is the server's answer, or 'invalid' / 'network' from here. Any
 * definite answer clears the pending code; a network failure keeps it to try
 * again later.
 */
export async function redeemInvite(rawCode) {
  const code = parseInviteCode(rawCode);
  if (!code) {
    return { ok: false, status: 'invalid', message: 'Invite codes are 6 letters and numbers.' };
  }
  if (!supabase) return { ok: false, status: 'network', message: 'Accounts are not set up in this build.' };

  const { data, error } = await supabase.rpc('redeem_invite', {
    p_code: code,
    p_device: await getDeviceMarker(),
  });
  if (error) return { ok: false, status: 'network', message: friendlyError(error) };

  await updateReferralState({ pendingCode: null });
  const result = {
    ok: data?.status === 'ok',
    status: data?.status || 'unknown',
    inviterName: data?.inviterName || null,
    proUntil: data?.proUntil || null,
  };
  if (result.ok) await setReferralProUntil(result.proUntil);
  return { ...result, message: describeRedeem(result) };
}

let inFlight = null;

/**
 * Catch the phone up with the server. Run when a session arrives and when the
 * app comes back to the foreground. Returns what is worth telling the person:
 *
 *   redeemed   the redeem result, if a pending code was just tried
 *   newJoins   pals who joined with my code since I was last told
 *
 * Only one runs at a time - sign-in fires several auth events in a row, and
 * two of them racing would redeem the same code twice.
 */
export function syncReferrals() {
  if (!inFlight) {
    inFlight = runSync().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

async function runSync() {
  const status = await getReferralStatus().catch(() => ({ ok: false }));
  if (!status.ok) return { ok: false, newJoins: 0 };

  const local = await getReferralState();
  let redeemed = null;
  if (local.pendingCode) {
    if (status.canRedeem) {
      redeemed = await redeemInvite(local.pendingCode);
    } else {
      // An existing account opened an invite link: nothing to claim. Only
      // worth saying something if they did not already join through a pal.
      await updateReferralState({ pendingCode: null });
      if (!status.invited) {
        redeemed = { ok: false, status: 'too_late', message: MESSAGES.too_late };
      }
    }
  }

  // First sync on this phone: start counting from here rather than
  // announcing pals who joined months ago.
  const seen = local.seenJoined == null ? status.palsJoined : local.seenJoined;
  const newJoins = Math.max(0, status.palsJoined - seen);
  if (status.palsJoined !== local.seenJoined) {
    await updateReferralState({ seenJoined: status.palsJoined });
  }

  return { ok: true, redeemed, newJoins };
}

/** The message for pals joining with my code. */
export function describeNewJoins(count) {
  const days = count * REFERRAL.rewardDays;
  return count === 1
    ? `A pal just joined with your invite code. You get ${days} more days of Pro!`
    : `${count} pals just joined with your invite code. You get ${days} more days of Pro!`;
}

// ==================== reminders ====================

/**
 * Something to say about invite Pro on Home, at most once per end date:
 *   { kind: 'ending', daysLeft }  in its last REFERRAL.endingSoonDays days
 *   { kind: 'ended' }             just after it ran out
 * or null. Quiet for anyone on a plan that does not end with it.
 */
export async function getReferralNotice(now = new Date()) {
  const sub = await getSubscription();
  const until = sub.referralProUntil;
  if (!until) return null;

  if (sub.type === 'unlimited' || hasPaidPlan(sub, now)) return null;

  const state = await getReferralState();
  if (hasReferralPro(sub, now)) {
    const left = daysLeft(until, now);
    if (left > REFERRAL.endingSoonDays || state.warnedFor === until) return null;
    await updateReferralState({ warnedFor: until });
    return { kind: 'ending', daysLeft: left };
  }

  // An end date long gone (a restore onto a new phone) is not news.
  const recent = now - new Date(until) < 30 * DAY_MS;
  if (!recent || state.endedFor === until) return null;
  await updateReferralState({ endedFor: until, warnedFor: until });
  return { kind: 'ended' };
}

/** The words for a notice from getReferralNotice(). */
export function describeReferralNotice(notice) {
  if (!notice) return '';
  if (notice.kind === 'ending') {
    const when = notice.daysLeft <= 1 ? 'tomorrow' : `in ${notice.daysLeft} days`;
    return `Your Pro days end ${when}. Invite a pal for ${REFERRAL.rewardDays} more!`;
  }
  return `Your Pro days are over. Your streak is safe, and you have ${PRICING.freeWordsPerDay} free words a day.`;
}
