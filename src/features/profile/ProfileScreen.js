import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LANGUAGES, ROUTES } from '../../config';
import { COLORS, RADIUS, SHADOW } from '../../theme';
import { PetSprite, PixelIcon, PixelSprite, useAlert } from '../../components';
import { useSession } from '../../hooks/useSession';
import { refreshWidget } from '../../services/widgetService';
import {
  deleteAccount,
  isSupabaseConfigured,
  pushProgress,
  signOutAccount,
} from '../../services/accountService';
import { getStickers } from '../../services/collectionService';
import { eraseDeviceData } from '../../services/deviceDataService';
import { getPetState } from '../../services/petService';
import { canChangeGoal, getUserProfile, updateUserProfile } from '../../services/profileService';
import { getSubscription } from '../../services/subscriptionService';

const PLAN_LABELS = {
  free: { title: 'Free Plan', detail: '3 free words each day', pro: false },
  per_word: { title: 'Pay Per Word', detail: 'Word pack balance', pro: false },
  monthly: { title: 'Monthly Pro', detail: 'Unlimited words', pro: true },
  yearly: { title: 'Yearly Pro', detail: 'Unlimited words', pro: true },
  unlimited: { title: 'Unlimited Pro', detail: 'Unlocked with a promo code', pro: true },
};

// A proper ">" for list rows; PixelIcon's chevron reads as a flag at row size.
const CHEVRON = {
  grid: ['cc...', '.cc..', '..cc.', '.cc..', 'cc...'],
  palette: { c: COLORS.textMuted },
};

const CLOUD = {
  grid: ['..wwww....', '.wwwwwww..', 'wwwwwwwwww', '.wwwwwwww.'],
  palette: { w: '#FFFFFF' },
};

export default function ProfileScreen({ navigation }) {
  const showAlert = useAlert();
  const { signedOut, user, account } = useSession();
  const [profile, setProfile] = useState(null);
  const [pet, setPet] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [totalWords, setTotalWords] = useState(0);

  const loadData = useCallback(async () => {
    const [p, petState, sub, stickers] = await Promise.all([
      getUserProfile(),
      getPetState(),
      getSubscription(),
      getStickers(),
    ]);

    setProfile(p);
    setPet(petState);
    setSubscription(sub);
    setTotalWords(stickers.length);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleChangeGoal = async () => {
    const canChange = await canChangeGoal();
    if (!canChange) {
      showAlert(
        'Not just yet',
        'You can change your daily goal once a week. This keeps your habit nice and steady.'
      );
      return;
    }
    navigation.navigate(ROUTES.GOAL_SETTING);
  };

  // Ending the session and erasing the phone used to be the same button,
  // because there was no session to end. Now they are two very different
  // things and the copy has to keep them apart: log out is reversible, erase
  // is not.
  const handleLogOut = () => {
    showAlert(
      'Log out?',
      'Your words, photos, and buddy stay on this phone. Log back in any time to find your pals again.',
      [
        { text: 'Stay', style: 'cancel' },
        {
          text: 'Log out',
          onPress: async () => {
            // Last chance to publish anything captured while offline.
            await pushProgress();
            const result = await signOutAccount();
            if (!result.ok) showAlert('Could not log out', result.error);
          },
        },
      ]
    );
  };

  // The old destructive path, now named for what it actually does.
  const handleErase = () => {
    showAlert(
      'Erase everything?',
      user
        ? 'This wipes the words, photos, pals, and buddy stored on this phone. Your account stays, so logging back in keeps your pals — but the collection on this phone is gone for good.'
        : 'Your words, photos, pals, and buddy are stored on this phone only, so this erases them. This cannot be undone. A paid plan stays with your Apple ID — tap Restore Purchases to get it back.',
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Erase',
          style: 'destructive',
          onPress: async () => {
            await eraseDeviceData();
            if (user) await signOutAccount();
            refreshWidget();
            signedOut();
          },
        },
      ]
    );
  };

  // The end of the line: the account and everything on this phone. Worded so
  // nobody reaches it thinking it is the same as logging out, and it says
  // plainly that pals lose them too, which is the part people do not expect.
  const handleDeleteAccount = () => {
    showAlert(
      'Delete your account?',
      'This deletes your account, your username, and your place in your pals\u2019 lists, then erases the words, photos, and buddy on this phone. Nothing about this can be undone. A paid plan stays with your Apple ID.',
      [
        { text: 'Keep my account', style: 'cancel' },
        {
          text: 'Delete forever',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteAccount();
            if (!result.ok) {
              showAlert('Could not delete', result.error);
              return;
            }
            await eraseDeviceData();
            refreshWidget();
            signedOut();
          },
        },
      ]
    );
  };

  const showComingSoon = (feature) =>
    showAlert(feature, 'This is coming in a future update. Thanks for your patience!');

  if (!profile || !pet) {
    return <View style={styles.container} />;
  }

  const targetLang = LANGUAGES.find((l) => l.code === profile.targetLanguage);
  const planKey = subscription?.type || 'free';
  const plan = PLAN_LABELS[planKey] || PLAN_LABELS.free;
  const planDetail =
    planKey === 'per_word'
      ? `${subscription?.wordBalance ?? 0} words remaining`
      : plan.detail;

  // Soft parchment tiles; only the small icon carries the colour.
  const stats = [
    { label: totalWords === 1 ? 'Word learned' : 'Words learned', value: totalWords, icon: 'book', color: '#6E9CC9' },
    { label: 'Day streak', value: pet.streak, icon: 'flame', color: '#D9895A' },
  ];

  const pickLanguage = () =>
    navigation.navigate(ROUTES.LANGUAGE_SELECT, {
      current: profile.targetLanguage,
      onSelect: async (code) => {
        await updateUserProfile({ targetLanguage: code });
        loadData();
      },
    });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* A little sky with your buddy in it */}
      <View style={styles.sky}>
        {/* Keeps the pull-down bounce sky-coloured instead of beige */}
        <View style={styles.skyOverscroll} />
        <PixelSprite grid={CLOUD.grid} palette={CLOUD.palette} pixelSize={5} style={styles.cloudA} />
        <PixelSprite grid={CLOUD.grid} palette={CLOUD.palette} pixelSize={3} style={styles.cloudB} />
        <View style={styles.petStage}>
          <PetSprite mood={pet.mood} species={pet.species} outfit={pet.equippedOutfit} pixelSize={6} />
        </View>
        <View style={styles.grass} />
      </View>

      {/* Who you are: name and handle as one identity, edited together */}
      <View style={styles.idCard}>
        <Text style={styles.userName} numberOfLines={1}>
          {profile.name}
        </Text>
        {account?.username ? <Text style={styles.userHandle}>@{account.username}</Text> : null}
        <Text style={styles.userSubtext}>
          Learning <Text style={styles.userSubtextStrong}>{targetLang?.name}</Text> with{' '}
          <Text style={styles.userSubtextStrong}>{pet.name}</Text>
        </Text>
        <TouchableOpacity
          style={styles.editButton}
          activeOpacity={0.8}
          onPress={() => navigation.navigate(ROUTES.EDIT_PROFILE)}
        >
          <Text style={styles.editButtonText}>Edit profile</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsGrid}>
        {stats.map((stat) => (
          <View key={stat.label} style={styles.statTile}>
            <View style={[styles.statIcon, { backgroundColor: stat.color }]}>
              <PixelIcon name={stat.icon} size={18} color="#FFFFFF" light={stat.color} />
            </View>
            <View>
              <Text style={styles.statNumber}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Plan */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => navigation.navigate(ROUTES.SUBSCRIPTION)}
        style={[styles.planCard, plan.pro ? styles.planCardPro : styles.planCardFree]}
      >
        <View style={styles.planIcon}>
          <PixelIcon
            name={plan.pro ? 'trophy' : 'star'}
            size={22}
            color={plan.pro ? COLORS.sun : '#FFFFFF'}
            light={COLORS.surface}
          />
        </View>
        <View style={styles.planTextWrap}>
          <Text style={styles.planTitle}>{plan.title}</Text>
          <Text style={styles.planDetail}>{planDetail}</Text>
        </View>
        <View style={styles.planCta}>
          <Text style={styles.planCtaText}>{plan.pro ? 'MANAGE' : 'GO PRO'}</Text>
        </View>
      </TouchableOpacity>

      {/* Learning */}
      <Group title="LEARNING">
        <Row
          icon="target"
          color={COLORS.secondary}
          label="Daily goal"
          value={`${profile.dailyGoal} words`}
          onPress={handleChangeGoal}
        />
        <Row
          icon="chat"
          color={COLORS.water}
          label="Language"
          value={targetLang?.name || 'Choose'}
          onPress={pickLanguage}
          last
        />
      </Group>

      {/* Account. Hidden entirely when the app is built without a backend,
          rather than showing rows that cannot do anything. */}
      {isSupabaseConfigured ? (
        <Group title="ACCOUNT">
          {user ? (
            <>
              <Row
                icon="lock"
                color={COLORS.berry}
                label="Signed in"
                value={user.email || 'Apple ID'}
                onPress={() =>
                  showAlert(
                    'Signed in',
                    user.email
                      ? `This phone is signed in as ${user.email}.`
                      : 'This phone is signed in with your Apple ID.'
                  )
                }
              />
              <Row icon="arrowLeft" color={COLORS.textMuted} label="Log out" onPress={handleLogOut} last />
            </>
          ) : (
            <Row
              icon="people"
              color={COLORS.leaf}
              label="Sign in or sign up"
              value="Find your pals"
              onPress={() => navigation.navigate(ROUTES.AUTH)}
              last
            />
          )}
        </Group>
      ) : null}

      {/* More */}
      <Group title="MORE">
        <Row icon="gear" color={COLORS.primary} label="App settings" onPress={() => showComingSoon('App settings')} />
        <Row icon="chat" color={COLORS.accent} label="Help & support" onPress={() => showComingSoon('Help & support')} />
        <Row icon="lock" color={COLORS.outlineSoft} label="Privacy policy" onPress={() => showComingSoon('Privacy policy')} last />
      </Group>

      {/* The irreversible ones live apart from everything else */}
      <View style={styles.dangerZone}>
        <TouchableOpacity onPress={handleErase} hitSlop={8}>
          <Text style={styles.dangerText}>Erase everything on this phone</Text>
        </TouchableOpacity>
        {isSupabaseConfigured && user ? (
          <TouchableOpacity onPress={handleDeleteAccount} hitSlop={8}>
            <Text style={styles.dangerText}>Delete my account</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.footer}>
        <PetSprite mood="content" species={pet.species} pixelSize={2} animate={false} />
        <Text style={styles.footerText}>MADE FOR CURIOUS MINDS</Text>
      </View>
    </ScrollView>
  );
}

function Group({ title, children }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.groupCard}>{children}</View>
    </View>
  );
}

function Row({ icon, color, label, value, onPress, last }) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.row, !last && styles.rowDivider]}
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
    >
      <View style={[styles.rowIcon, { backgroundColor: color }]}>
        <PixelIcon name={icon} size={16} color="#FFFFFF" light={color} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      {value ? (
        <Text style={styles.rowValue} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      <PixelSprite grid={CHEVRON.grid} palette={CHEVRON.palette} pixelSize={2} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: 130 },
  sky: {
    height: 224,
    backgroundColor: COLORS.sky,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  skyOverscroll: {
    position: 'absolute',
    top: -600,
    left: 0,
    right: 0,
    height: 600,
    backgroundColor: COLORS.sky,
  },
  cloudA: { position: 'absolute', top: 70, left: 28, opacity: 0.9 },
  cloudB: { position: 'absolute', top: 92, right: 46, opacity: 0.8 },
  // Feet on the grass, clear of the name card that overlaps the bottom edge.
  petStage: { marginBottom: 24, zIndex: 1 },
  grass: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 22,
    backgroundColor: COLORS.leaf,
    borderTopWidth: 3,
    borderTopColor: COLORS.leafDark,
  },
  idCard: {
    marginHorizontal: 20,
    marginTop: -14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 3,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.lg,
    ...SHADOW.card,
  },
  userName: { fontSize: 22, fontWeight: '900', color: COLORS.text, maxWidth: '100%' },
  userHandle: { fontSize: 14, fontWeight: '700', color: COLORS.textMuted, marginTop: 1 },
  userSubtext: { fontSize: 13, color: COLORS.textLight, marginTop: 4, fontWeight: '600' },
  userSubtextStrong: { fontWeight: '900', color: COLORS.text },
  editButton: {
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 7,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 2,
    borderColor: COLORS.outlineSoft,
    borderRadius: RADIUS.md,
  },
  editButtonText: { fontSize: 13, fontWeight: '900', color: COLORS.text },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  statTile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.outlineSoft,
    borderRadius: RADIUS.lg,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: { fontSize: 22, fontWeight: '900', color: COLORS.text, lineHeight: 26 },
  statLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textLight },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginTop: 16,
    padding: 14,
    borderWidth: 3,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.lg,
    ...SHADOW.card,
  },
  planCardFree: { backgroundColor: COLORS.berry },
  planCardPro: { backgroundColor: '#5B4BB5' },
  planIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planTextWrap: { flex: 1 },
  planTitle: { fontSize: 16, fontWeight: '900', color: '#FFFFFF' },
  planDetail: { fontSize: 12, color: '#FFFFFFDD', marginTop: 2, fontWeight: '700' },
  planCta: {
    backgroundColor: COLORS.sun,
    borderWidth: 2,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.md,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  planCtaText: { fontSize: 11, fontWeight: '900', color: COLORS.text, letterSpacing: 1 },
  group: { marginTop: 22, paddingHorizontal: 20 },
  groupTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.textLight,
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  groupCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 3,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOW.soft,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowDivider: { borderBottomWidth: 2, borderBottomColor: COLORS.surfaceAlt },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '800', color: COLORS.text },
  rowValue: { maxWidth: '45%', fontSize: 14, fontWeight: '700', color: COLORS.textMuted },
  dangerZone: { marginTop: 26, alignItems: 'center', gap: 14 },
  dangerText: { fontSize: 13, fontWeight: '800', color: COLORS.danger },
  footer: { marginTop: 28, alignItems: 'center', gap: 8, opacity: 0.7 },
  footerText: { color: COLORS.textMuted, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
});
