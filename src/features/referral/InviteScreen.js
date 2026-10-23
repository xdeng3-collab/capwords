import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { REFERRAL, ROUTES } from '../../config';
import { COLORS, RADIUS, SHADOW } from '../../theme';
import { BackButton, PetSprite, PixelButton, PixelIcon } from '../../components';
import { useSession } from '../../hooks/useSession';
import { isSupabaseConfigured } from '../../services/accountService';
import {
  buildInviteMessage,
  getReferralStatus,
  redeemInvite,
} from '../../services/referralService';
import {
  getSubscription,
  hasPaidPlan,
  referralDaysLeft,
} from '../../services/subscriptionService';
import { errorFeedback, successFeedback } from '../../utils/haptics';

/**
 * Invite pals: my code to share, what it has earned so far, and - for a new
 * account that has not used one yet - a place to type a pal's code.
 */
export default function InviteScreen({ navigation }) {
  const { user, refreshAccount } = useSession();
  const [status, setStatus] = useState(null); // getReferralStatus() result
  // Invite days to come, and whether they are waiting behind a paid plan.
  const [proLeft, setProLeft] = useState(0);
  const [paying, setPaying] = useState(false);
  const [loading, setLoading] = useState(false);

  const readPlan = useCallback(async () => {
    const sub = await getSubscription();
    setProLeft(referralDaysLeft(sub));
    setPaying(hasPaidPlan(sub));
  }, []);

  const load = useCallback(async () => {
    await readPlan();
    if (!user) {
      setStatus(null);
      return;
    }
    setLoading(true);
    try {
      // Also stores the latest end date, so the plan is read again after.
      setStatus(await getReferralStatus());
      await readPlan();
    } finally {
      setLoading(false);
    }
  }, [user, readPlan]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const share = async () => {
    if (!status?.code) return;
    try {
      await Share.share({ message: buildInviteMessage(status.code) });
    } catch (e) {
      // Closing the share sheet is not an error worth showing.
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.title}>INVITE PALS</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.pets}>
            <PetSprite mood="happy" species="cat" pixelSize={5} animate={false} />
            <PixelIcon name="heart" size={20} color={COLORS.berry} />
            <PetSprite mood="happy" species="dog" pixelSize={5} animate={false} />
          </View>
          <Text style={styles.heroTitle}>
            Invite a pal, you both get {REFERRAL.rewardDays} days of Pro
          </Text>
          <Text style={styles.heroBody}>
            When a friend makes a new account with your code, you each get unlimited words for{' '}
            {REFERRAL.rewardDays} days.
          </Text>
        </View>

        {!isSupabaseConfigured ? (
          <Text style={styles.muted}>Invites need accounts, which this build does not have.</Text>
        ) : !user ? (
          <SignedOut navigation={navigation} />
        ) : loading && !status ? (
          <ActivityIndicator color={COLORS.primary} style={styles.spinner} />
        ) : status && !status.ok ? (
          <View style={styles.card}>
            <Text style={styles.errorText}>{status.error || 'Could not load your invite code.'}</Text>
            <PixelButton label="TRY AGAIN" onPress={load} style={styles.fill} />
          </View>
        ) : status ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>YOUR INVITE CODE</Text>
              <Text style={styles.code} selectable accessibilityLabel={(status.code || '').split('').join(' ')}>
                {status.code}
              </Text>
              <PixelButton
                label="SHARE INVITE"
                icon="share"
                color={COLORS.leaf}
                size="lg"
                onPress={share}
                style={styles.fill}
              />
            </View>

            <View style={styles.stats}>
              <Stat value={status.palsJoined} label={status.palsJoined === 1 ? 'Pal joined' : 'Pals joined'} />
              <Stat
                value={proLeft}
                label={
                  paying
                    ? proLeft === 1 ? 'Day after your plan' : 'Days after your plan'
                    : proLeft === 1 ? 'Pro day left' : 'Pro days left'
                }
              />
            </View>

            {status.invited ? (
              <Text style={styles.muted}>
                You joined with {status.invitedBy ? `${status.invitedBy}'s` : 'a pal’s'} code.
              </Text>
            ) : status.canRedeem ? (
              <RedeemCard
                onRedeemed={() => {
                  load();
                  refreshAccount?.();
                }}
              />
            ) : null}
          </>
        ) : null}

        <View style={styles.steps}>
          <Text style={styles.stepsTitle}>HOW IT WORKS</Text>
          <Step n={1} text="Share your code with a friend." />
          <Step
            n={2}
            text={`They make a new Voyaword account and enter it, within ${REFERRAL.redeemWindowDays} days of signing up.`}
          />
          <Step n={3} text={`You both get ${REFERRAL.rewardDays} days of Pro, and become pals.`} />
        </View>

        <Text style={styles.finePrint}>
          A code counts for a new account on a phone that has not been signed in to another Voyaword
          account. Pro from invites adds up to {REFERRAL.maxBankedDays} days ahead. If you already
          pay for Pro, invite days wait and start when your paid period ends, so your membership
          lasts longer.
        </Text>
      </ScrollView>
    </View>
  );
}

function SignedOut({ navigation }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardBody}>Make an account to get your own invite code.</Text>
      <PixelButton
        label="SIGN UP"
        size="lg"
        color={COLORS.leaf}
        onPress={() => navigation.navigate(ROUTES.AUTH, { mode: 'signup' })}
        style={styles.fill}
      />
      <TouchableOpacity
        onPress={() => navigation.navigate(ROUTES.AUTH, { mode: 'signin' })}
        hitSlop={8}
      >
        <Text style={styles.link}>I already have an account</Text>
      </TouchableOpacity>
    </View>
  );
}

// Its own component so typing only re-renders this card.
function RedeemCard({ onRedeemed }) {
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const redeem = async () => {
    if (busy || !code.trim()) return;
    Keyboard.dismiss();
    setBusy(true);
    try {
      const outcome = await redeemInvite(code);
      setResult(outcome);
      if (outcome.ok) {
        successFeedback();
        setCode('');
        onRedeemed();
      } else {
        errorFeedback();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>GOT A CODE FROM A PAL?</Text>
      <View style={styles.redeemRow}>
        <TextInput
          style={styles.input}
          value={code}
          onChangeText={(text) => {
            setCode(text);
            if (result) setResult(null);
          }}
          placeholder="ABC234"
          placeholderTextColor={COLORS.textMuted}
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="off"
          maxLength={12}
          returnKeyType="done"
          onSubmitEditing={redeem}
        />
        <TouchableOpacity
          style={[styles.redeemButton, (!code.trim() || busy) && styles.redeemButtonDisabled]}
          onPress={redeem}
          disabled={!code.trim() || busy}
        >
          <Text style={styles.redeemButtonText}>{busy ? '...' : 'REDEEM'}</Text>
        </TouchableOpacity>
      </View>
      {result ? (
        <Text style={[styles.result, result.ok ? styles.resultOk : styles.errorText]}>
          {result.message}
        </Text>
      ) : null}
    </View>
  );
}

function Stat({ value, label }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Step({ n, text }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepBadge}>
        <Text style={styles.stepNumber}>{n}</Text>
      </View>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 58,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  title: { fontSize: 16, fontWeight: '900', color: COLORS.text, letterSpacing: 1 },
  headerSpacer: { width: 40 },
  content: { padding: 20, paddingBottom: 140, gap: 16 },

  hero: { alignItems: 'center', gap: 10, paddingTop: 4 },
  pets: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.text,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  heroBody: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 20,
  },

  card: {
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 3,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.lg,
    ...SHADOW.soft,
  },
  cardLabel: { fontSize: 12, fontWeight: '900', color: COLORS.textLight, letterSpacing: 1 },
  cardBody: { fontSize: 15, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  code: {
    fontSize: 38,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 8,
    // Letter spacing trails the last letter too; this keeps the code centred.
    paddingLeft: 8,
  },
  fill: { alignSelf: 'stretch' },
  link: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primaryDark,
    paddingBottom: 2,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primaryDark,
  },

  stats: { flexDirection: 'row', gap: 10 },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.outlineSoft,
    borderRadius: RADIUS.lg,
  },
  statValue: { fontSize: 24, fontWeight: '900', color: COLORS.text },
  statLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textLight },

  redeemRow: { flexDirection: 'row', gap: 8, alignSelf: 'stretch' },
  input: {
    flex: 1,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 2,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
    color: COLORS.text,
  },
  redeemButton: {
    justifyContent: 'center',
    paddingHorizontal: 14,
    backgroundColor: COLORS.sun,
    borderWidth: 2,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.md,
  },
  redeemButtonDisabled: { opacity: 0.5 },
  redeemButtonText: { fontSize: 13, fontWeight: '900', color: COLORS.text, letterSpacing: 1 },
  result: { fontSize: 13, fontWeight: '800', textAlign: 'center' },
  resultOk: { color: COLORS.leafDark },
  errorText: { fontSize: 13, fontWeight: '800', color: COLORS.danger, textAlign: 'center' },

  steps: { gap: 10, marginTop: 4 },
  stepsTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.textLight,
    letterSpacing: 1,
    marginLeft: 4,
  },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    borderColor: COLORS.outline,
    backgroundColor: COLORS.sun,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: { fontSize: 14, fontWeight: '900', color: COLORS.text },
  stepText: { flex: 1, fontSize: 14, fontWeight: '700', color: COLORS.text, lineHeight: 20 },

  muted: { fontSize: 14, fontWeight: '700', color: COLORS.textLight, textAlign: 'center' },
  finePrint: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    lineHeight: 18,
    textAlign: 'center',
  },
  spinner: { marginVertical: 20 },
});
