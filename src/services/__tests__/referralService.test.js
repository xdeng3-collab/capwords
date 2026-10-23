import AsyncStorage from '@react-native-async-storage/async-storage';
import { PRICING, REFERRAL } from '../../config';
import {
  daysLeft,
  getReferralNotice,
  getPendingInviteCode,
  inviteCodeFromUrl,
  parseInviteCode,
  redeemInvite,
  rememberInviteFromUrl,
  syncReferrals,
} from '../referralService';
import { recordWordLearned } from '../progressService';
import {
  canLearnWord,
  getGoalCap,
  getSubscription,
  referralDaysLeft,
  updateSubscription,
} from '../subscriptionService';
import { applyEntitlements } from '../purchaseService';

// A stand-in for the two database functions, answering whatever each test
// puts in `server`.
const server = { status: null, redeem: null, calls: [], oldDatabase: false };

jest.mock('../../api/supabaseClient', () => ({
  supabase: {
    rpc: jest.fn(async (name, args) => {
      server.calls.push({ name, args });
      if (name === 'referral_status') {
        // Before the paid-period migration there is no three-argument version.
        if (server.oldDatabase && args.p_paid_from) {
          return { data: null, error: { code: 'PGRST202', message: 'Could not find the function' } };
        }
        return { data: server.status, error: null };
      }
      if (name === 'redeem_invite') return { data: server.redeem, error: null };
      return { data: null, error: { message: 'unknown function' } };
    }),
  },
  friendlyError: (e) => e?.message || 'Something went wrong.',
  isSupabaseConfigured: true,
  startSessionAutoRefresh: () => () => {},
}));

jest.mock('../accountService', () => ({
  getCurrentUser: jest.fn(async () => ({ id: 'me' })),
}));

const NOW = new Date(Date.UTC(2026, 9, 24, 12));
const inDays = (n) => new Date(NOW.getTime() + n * 24 * 60 * 60 * 1000).toISOString();

const status = (overrides = {}) => ({
  code: 'ABC234',
  invited: false,
  invitedBy: null,
  canRedeem: false,
  palsJoined: 0,
  proUntil: null,
  ...overrides,
});

beforeEach(async () => {
  await AsyncStorage.clear();
  server.status = status();
  server.redeem = null;
  server.calls = [];
  server.oldDatabase = false;
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
  jest.setSystemTime(NOW);
});

afterEach(() => jest.useRealTimers());

describe('codes', () => {
  it('reads a code however it was typed', () => {
    expect(parseInviteCode(' abc-234 ')).toBe('ABC234');
    expect(parseInviteCode('ABC 234')).toBe('ABC234');
  });

  it('refuses what cannot be a code', () => {
    expect(parseInviteCode('')).toBeNull();
    expect(parseInviteCode('ABC23')).toBeNull();
    // 0, O, 1 and I are never in a code.
    expect(parseInviteCode('ABC230')).toBeNull();
    expect(parseInviteCode('ABCDEI')).toBeNull();
  });

  it('finds the code in an invite link and ignores other links', () => {
    expect(inviteCodeFromUrl('capwords://invite/abc234')).toBe('ABC234');
    expect(inviteCodeFromUrl('capwords://invite?code=ABC234')).toBe('ABC234');
    expect(inviteCodeFromUrl('https://voyaword.app/?invite=ABC234')).toBe('ABC234');
    expect(inviteCodeFromUrl('capwords://camera')).toBeNull();
    expect(inviteCodeFromUrl('capwords://auth-callback#access_token=x')).toBeNull();
  });

  it('keeps a code from a link for the account made later', async () => {
    expect(await rememberInviteFromUrl('capwords://camera')).toBeNull();
    expect(await getPendingInviteCode()).toBeNull();
    await rememberInviteFromUrl('capwords://invite/ABC234');
    expect(await getPendingInviteCode()).toBe('ABC234');
  });
});

describe('invite Pro', () => {
  it('lifts the daily limit and the goal cap until it ends', async () => {
    for (let i = 0; i < PRICING.freeWordsPerDay; i++) await recordWordLearned();
    await updateSubscription({ referralProUntil: inDays(3) });
    expect(await canLearnWord()).toEqual({ allowed: true, reason: 'referral' });
    expect(await getGoalCap()).toBeNull();

    // A new day, so the free words are back - but only those.
    jest.setSystemTime(new Date(inDays(4)));
    expect((await canLearnWord()).reason).toBe('free');
    expect(await getGoalCap()).toBe(PRICING.freeWordsPerDay);
  });

  it('is used before a word pack, so paid words are not spent', async () => {
    for (let i = 0; i < PRICING.freeWordsPerDay; i++) await recordWordLearned();
    await updateSubscription({ type: 'per_word', wordBalance: 5, referralProUntil: inDays(3) });
    expect((await canLearnWord()).reason).toBe('referral');
  });

  it('reads as nothing on a plan saved before it existed', async () => {
    await AsyncStorage.setItem(
      'capwords_subscription',
      JSON.stringify({ type: 'free', wordBalance: 0, expiresAt: null, promoCode: null })
    );
    expect((await getSubscription()).referralProUntil).toBeNull();
  });

  it('counts days left rounding up', () => {
    expect(daysLeft(inDays(0.5))).toBe(1);
    expect(daysLeft(inDays(7))).toBe(7);
    expect(daysLeft(inDays(-1))).toBe(0);
    expect(daysLeft(null)).toBe(0);
  });
});

describe('paying members', () => {
  it('count only the invite days after the paid period', async () => {
    await updateSubscription({
      type: 'monthly',
      expiresAt: inDays(10),
      referralProUntil: inDays(17),
    });
    expect(referralDaysLeft(await getSubscription())).toBe(7);

    // Once the plan lapses, what is left counts from now.
    jest.setSystemTime(new Date(inDays(12)));
    expect(referralDaysLeft(await getSubscription())).toBe(5);
  });

  it('remember when the App Store period began, and forget it when it ends', async () => {
    await applyEntitlements([
      {
        productId: 'com.capwordsxxx.app.pro.monthly',
        purchasedAt: Date.parse(inDays(-3)),
        expiresAt: Date.parse(inDays(27)),
      },
    ]);
    expect(await getSubscription()).toMatchObject({
      type: 'monthly',
      periodStart: inDays(-3),
      expiresAt: inDays(27),
    });

    await applyEntitlements([]);
    expect(await getSubscription()).toMatchObject({ type: 'free', periodStart: null });
  });

  it('send that period with the status, so invite days wait for it', async () => {
    await updateSubscription({ type: 'yearly', periodStart: inDays(-3), expiresAt: inDays(362) });
    await syncReferrals();
    const call = server.calls.find((c) => c.name === 'referral_status');
    expect(call.args).toMatchObject({ p_paid_from: inDays(-3), p_paid_until: inDays(362) });
  });

  it('still work against a database without the paid-period migration', async () => {
    server.oldDatabase = true;
    server.status = status({ proUntil: inDays(7) });
    await updateSubscription({ type: 'monthly', periodStart: inDays(-3), expiresAt: inDays(27) });
    expect((await syncReferrals()).ok).toBe(true);
    expect(server.calls.map((c) => Object.keys(c.args).length)).toEqual([3, 1]);
    expect((await getSubscription()).referralProUntil).toBe(inDays(7));
  });

  it('send no period for a free learner', async () => {
    await syncReferrals();
    const call = server.calls.find((c) => c.name === 'referral_status');
    expect(Object.keys(call.args)).toEqual(['p_device']);
  });
});

describe('redeemInvite', () => {
  it('checks the shape before asking the server', async () => {
    expect(await redeemInvite('nope')).toMatchObject({ ok: false, status: 'invalid' });
    expect(server.calls).toHaveLength(0);
  });

  it('stores the Pro it earns and sends this phone along', async () => {
    server.redeem = { status: 'ok', inviterName: 'Mia', proUntil: inDays(7) };
    const result = await redeemInvite('abc234');
    expect(result).toMatchObject({ ok: true, inviterName: 'Mia' });
    expect(result.message).toContain('Mia');
    expect((await getSubscription()).referralProUntil).toBe(inDays(7));

    const call = server.calls.find((c) => c.name === 'redeem_invite');
    expect(call.args.p_code).toBe('ABC234');
    expect(call.args.p_device).toMatch(/^[0-9a-f]{32}$/);
  });

  it('explains a refusal without granting anything', async () => {
    server.redeem = { status: 'device_used' };
    const result = await redeemInvite('ABC234');
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/new pals/);
    expect((await getSubscription()).referralProUntil).toBeNull();
  });
});

describe('syncReferrals', () => {
  it('redeems a waiting code on a new account, once', async () => {
    await rememberInviteFromUrl('capwords://invite/ABC234');
    server.status = status({ canRedeem: true });
    server.redeem = { status: 'ok', inviterName: 'Mia', proUntil: inDays(7) };

    const [first, second] = await Promise.all([syncReferrals(), syncReferrals()]);
    expect(first.redeemed).toMatchObject({ ok: true });
    expect(second).toBe(first);
    expect(server.calls.filter((c) => c.name === 'redeem_invite')).toHaveLength(1);
    expect(await getPendingInviteCode()).toBeNull();
  });

  it('drops a code an older account cannot use, and says why', async () => {
    await rememberInviteFromUrl('capwords://invite/ABC234');
    server.status = status({ canRedeem: false });
    const result = await syncReferrals();
    expect(result.redeemed).toMatchObject({ ok: false, status: 'too_late' });
    expect(server.calls.filter((c) => c.name === 'redeem_invite')).toHaveLength(0);
    expect(await getPendingInviteCode()).toBeNull();
  });

  it('copies the end date down from the server', async () => {
    server.status = status({ proUntil: inDays(14) });
    await syncReferrals();
    expect((await getSubscription()).referralProUntil).toBe(inDays(14));
  });

  it('tells me about new pals once, but not about old ones on a new phone', async () => {
    server.status = status({ palsJoined: 4 });
    expect((await syncReferrals()).newJoins).toBe(0);

    server.status = status({ palsJoined: 6 });
    expect((await syncReferrals()).newJoins).toBe(2);
    expect((await syncReferrals()).newJoins).toBe(0);
  });
});

describe('getReferralNotice', () => {
  it('warns once near the end, then says once that it ended', async () => {
    await updateSubscription({ referralProUntil: inDays(REFERRAL.rewardDays) });
    expect(await getReferralNotice()).toBeNull();

    jest.setSystemTime(new Date(inDays(REFERRAL.rewardDays - 1.5)));
    expect(await getReferralNotice()).toEqual({ kind: 'ending', daysLeft: 2 });
    expect(await getReferralNotice()).toBeNull();

    jest.setSystemTime(new Date(inDays(REFERRAL.rewardDays + 1)));
    expect(await getReferralNotice()).toEqual({ kind: 'ended' });
    expect(await getReferralNotice()).toBeNull();
  });

  it('warns again when new days push the end back', async () => {
    await updateSubscription({ referralProUntil: inDays(1) });
    expect((await getReferralNotice()).kind).toBe('ending');
    await updateSubscription({ referralProUntil: inDays(2) });
    expect((await getReferralNotice()).kind).toBe('ending');
  });

  it('stays quiet for a paid plan and for an end long past', async () => {
    await updateSubscription({
      type: 'monthly',
      expiresAt: inDays(30),
      referralProUntil: inDays(1),
    });
    expect(await getReferralNotice()).toBeNull();

    await updateSubscription({ type: 'free', expiresAt: null, referralProUntil: inDays(-60) });
    expect(await getReferralNotice()).toBeNull();
  });
});
