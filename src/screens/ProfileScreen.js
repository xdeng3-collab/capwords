import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, LANGUAGES, RADIUS } from '../config';
import { PixelPanel } from '../components/UI';
import { useAlert } from '../components/PixelAlert';
import PixelIcon from '../components/PixelIcon';
import { useSession } from '../navigation/session';
import { refreshWidget } from '../services/widgetService';
import {
  deleteAccount,
  isSupabaseConfigured,
  pushProgress,
  setUsername,
  signOutAccount,
  updateMyProfile,
} from '../services/accountService';
import {
  getUserProfile,
  updateUserProfile,
  getStreak,
  getSubscription,
  getStickers,
  canChangeGoal,
  getPet,
  signOut,
} from '../services/storageService';

const PLAN_LABELS = {
  free: { title: 'Free Plan', detail: '3 free words each day', icon: 'seed' },
  per_word: { title: 'Pay Per Word', detail: 'Word pack balance', icon: 'star' },
  monthly: { title: 'Monthly Pro', detail: 'Unlimited words', icon: 'trophy' },
  yearly: { title: 'Yearly Pro', detail: 'Unlimited words', icon: 'trophy' },
  unlimited: { title: 'Unlimited Pro', detail: 'Unlocked with a promo code', icon: 'trophy' },
};

export default function ProfileScreen({ navigation }) {
  const showAlert = useAlert();
  const { signedOut, user, account, refreshAccount } = useSession();
  const [profile, setProfile] = useState(null);
  const [streak, setStreak] = useState({ current: 0, longest: 0 });
  const [subscription, setSubscription] = useState(null);
  const [totalWords, setTotalWords] = useState(0);
  const [petName, setPetName] = useState('');

  const loadData = useCallback(async () => {
    const [p, s, sub, stickers, pet] = await Promise.all([
      getUserProfile(),
      getStreak(),
      getSubscription(),
      getStickers(),
      getPet(),
    ]);

    setProfile(p);
    setStreak(s);
    setSubscription(sub);
    setTotalWords(stickers.length);
    setPetName(pet.name);
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
    navigation.navigate('GoalSetting');
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
            await signOut();
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
            await signOut();
            refreshWidget();
            signedOut();
          },
        },
      ]
    );
  };

  /**
   * The display name: what the profile header says and what pals see next to
   * the handle. It lives on the phone, so this works signed out too; when
   * there is an account, the copy up there is corrected in the same breath
   * rather than waiting for the next progress push.
   */
  const handleChangeName = () => {
    showAlert(
      'Your name',
      'Shown at the top of this screen, and to your pals. Up to 40 characters.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async (value) => {
            const name = (value || '').trim().slice(0, 40);
            if (!name) {
              showAlert('Needs a name', 'Type something for us to call you.');
              return;
            }
            await updateUserProfile({ name });
            if (user) {
              const result = await updateMyProfile({ display_name: name });
              if (!result.ok) {
                // The phone already has the new name; the account catching up
                // is not worth an error popup.
                showAlert('Saved on this phone', 'Your pals will see it next time you are online.');
              }
              await refreshAccount();
            }
            loadData();
          },
        },
      ],
      { prompt: true, defaultValue: profile?.name || '', placeholder: 'Your name' }
    );
  };

  // Handles are how pals find each other, so they are worth being able to
  // change. Uniqueness is settled by the database, not by a check here.
  const handleChangeUsername = () => {
    showAlert(
      'Choose a username',
      'This is how pals find you. 3-20 characters: letters, numbers, or underscores.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async (value) => {
            const result = await setUsername(value);
            if (!result.ok) {
              showAlert('That did not work', result.error);
              return;
            }
            await refreshAccount();
          },
        },
      ],
      { prompt: true, defaultValue: account?.username || '', placeholder: 'username' }
    );
  };

  const showComingSoon = (feature) =>
    showAlert(feature, 'This is coming in a future update. Thanks for your patience!');

  if (!profile) {
    return <View style={styles.container} />;
  }

  const targetLang = LANGUAGES.find((l) => l.code === profile.targetLanguage);
  const planKey = subscription?.type || 'free';
  const plan = PLAN_LABELS[planKey] || PLAN_LABELS.free;
  const planDetail =
    planKey === 'per_word'
      ? `${subscription?.wordBalance ?? 0} words remaining`
      : plan.detail;

  const initials = profile.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const stats = [
    { label: 'WORDS', value: totalWords, icon: 'book' },
    { label: 'STREAK', value: streak.current, icon: 'flame' },
    { label: 'BEST', value: streak.longest, icon: 'trophy' },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.userName}>{profile.name}</Text>
        {account?.username ? <Text style={styles.userHandle}>@{account.username}</Text> : null}
        <Text style={styles.userSubtext}>
          LEARNING {targetLang?.name?.toUpperCase()} WITH {petName.toUpperCase()}
        </Text>

        <View style={styles.statsRow}>
          {stats.map((stat) => (
            <PixelPanel key={stat.label} tone="alt" style={styles.statBox}>
              <PixelIcon name={stat.icon} size={18} color={COLORS.primary} light={COLORS.sun} />
              <Text style={styles.statNumber}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </PixelPanel>
          ))}
        </View>
      </View>

      {/* Who you are. Outside the account section on purpose: the name is
          stored on the phone, so it can be changed without signing in. */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>YOU</Text>
        <MenuRow
          icon="star"
          label={profile.name}
          hint="YOUR NAME"
          onPress={handleChangeName}
        />
      </View>

      {/* Subscription */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>YOUR PLAN</Text>
        <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate('Subscription')}>
          <PixelPanel style={styles.planCard}>
            <View style={styles.planLeft}>
              <View style={styles.iconBadge}>
                <PixelIcon name={plan.icon} size={20} color={COLORS.primary} light={COLORS.sun} />
              </View>
              <View style={styles.planTextWrap}>
                <Text style={styles.planTitle}>{plan.title}</Text>
                <Text style={styles.planDetail}>{planDetail}</Text>
              </View>
            </View>
            <PixelIcon name="chevron" size={16} color={COLORS.textMuted} />
          </PixelPanel>
        </TouchableOpacity>
      </View>

      {/* Learning settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>LEARNING</Text>
        <MenuRow
          icon="target"
          label={`${profile.dailyGoal} words per day`}
          hint="DAILY GOAL"
          onPress={handleChangeGoal}
        />
        <MenuRow
          icon="chat"
          label={targetLang?.name || 'Choose a language'}
          hint="TARGET LANGUAGE"
          onPress={() =>
            navigation.navigate('LanguageSelect', {
              current: profile.targetLanguage,
              onSelect: async (code) => {
                await updateUserProfile({ targetLanguage: code });
                loadData();
              },
            })
          }
        />
      </View>

      {/* Account. Hidden entirely when the app is built without a backend,
          rather than showing rows that cannot do anything. */}
      {isSupabaseConfigured ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCOUNT</Text>
          {user ? (
            <>
              <MenuRow
                icon="people"
                label={account?.username ? `@${account.username}` : 'Choose a username'}
                hint="HOW PALS FIND YOU"
                onPress={handleChangeUsername}
              />
              <MenuRow
                icon="lock"
                label={user.email || 'Signed in with Apple'}
                hint="SIGNED IN AS"
                onPress={() =>
                  showAlert(
                    'Signed in',
                    user.email
                      ? `This phone is signed in as ${user.email}.`
                      : 'This phone is signed in with your Apple ID.'
                  )
                }
              />
              <MenuRow icon="close" label="Log out" onPress={handleLogOut} />
              <MenuRow
                icon="close"
                label="Delete my account"
                onPress={handleDeleteAccount}
                destructive
              />
            </>
          ) : (
            <MenuRow
              icon="people"
              label="Sign in or make an account"
              hint="KEEP YOUR PALS AND PROGRESS"
              onPress={() => navigation.navigate('Auth')}
            />
          )}
        </View>
      ) : null}

      {/* More */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>MORE</Text>
        <MenuRow icon="gear" label="App settings" onPress={() => showComingSoon('App settings')} />
        <MenuRow icon="chat" label="Help & support" onPress={() => showComingSoon('Help & support')} />
        <MenuRow icon="lock" label="Privacy policy" onPress={() => showComingSoon('Privacy policy')} />
        <MenuRow
          icon="close"
          label="Erase everything on this phone"
          onPress={handleErase}
          destructive
        />
      </View>

      <Text style={styles.footer}>MADE FOR CURIOUS MINDS</Text>
    </ScrollView>
  );
}

function MenuRow({ icon, label, hint, onPress, destructive }) {
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
      <PixelPanel style={styles.menuItem}>
        <View style={styles.menuLeft}>
          <View style={styles.iconBadge}>
            <PixelIcon name={icon} size={18} color={COLORS.primary} light={COLORS.sun} />
          </View>
          <View>
            {hint ? <Text style={styles.menuHint}>{hint}</Text> : null}
            <Text style={[styles.menuText, destructive && styles.menuTextDanger]}>{label}</Text>
          </View>
        </View>
        <PixelIcon name="chevron" size={16} color={COLORS.textMuted} />
      </PixelPanel>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: 120 },
  header: {
    paddingTop: 64,
    paddingBottom: 22,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: COLORS.panel,
    borderBottomWidth: 3,
    borderBottomColor: COLORS.outline,
  },
  avatar: {
    width: 74,
    height: 74,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.sun,
    borderWidth: 3,
    borderColor: COLORS.outline,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 26, fontWeight: '900', color: COLORS.primaryDark },
  userName: { fontSize: 22, fontWeight: '900', color: COLORS.text, marginTop: 12, letterSpacing: 0.5 },
  userHandle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primaryDark,
    marginTop: 2,
  },
  userSubtext: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 4,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statsRow: { flexDirection: 'row', gap: 10, alignSelf: 'stretch', marginTop: 20 },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  statNumber: { fontSize: 20, fontWeight: '900', color: COLORS.text, marginTop: 5 },
  statLabel: { fontSize: 9, color: COLORS.textLight, marginTop: 1, fontWeight: '900', letterSpacing: 0.5 },
  section: { marginTop: 22, paddingHorizontal: 20 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.textLight,
    letterSpacing: 1,
    marginBottom: 10,
    marginLeft: 2,
  },
  planCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  planLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 2,
    borderColor: COLORS.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planTextWrap: { flex: 1 },
  planTitle: { fontSize: 15, fontWeight: '900', color: COLORS.text },
  planDetail: { fontSize: 12, color: COLORS.textLight, marginTop: 2, fontWeight: '600' },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingVertical: 11,
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  menuHint: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontWeight: '900',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  menuText: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  menuTextDanger: { color: COLORS.danger },
  footer: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 28,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
