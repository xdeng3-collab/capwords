import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, LANGUAGES, RADIUS } from '../config';
import { PixelPanel } from '../components/UI';
import PixelIcon from '../components/PixelIcon';
import {
  getUserProfile,
  updateUserProfile,
  getStreak,
  getSubscription,
  getStickers,
  canChangeGoal,
  getPet,
  seedDemoData,
} from '../services/storageService';

const PLAN_LABELS = {
  free: { title: 'Free Plan', detail: '3 free words each day', icon: 'seed' },
  per_word: { title: 'Pay Per Word', detail: 'Word pack balance', icon: 'star' },
  monthly: { title: 'Monthly Pro', detail: 'Unlimited words', icon: 'trophy' },
  yearly: { title: 'Yearly Pro', detail: 'Unlimited words', icon: 'trophy' },
};

export default function ProfileScreen({ navigation }) {
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
      Alert.alert(
        'Not just yet',
        'You can change your daily goal once a week. This keeps your habit nice and steady.'
      );
      return;
    }
    navigation.navigate('GoalSetting');
  };

  const showComingSoon = (feature) =>
    Alert.alert(feature, 'This is coming in a future update. Thanks for your patience!');

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

      {/* More */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>MORE</Text>
        <MenuRow icon="gear" label="App settings" onPress={() => showComingSoon('App settings')} />
        <MenuRow icon="chat" label="Help & support" onPress={() => showComingSoon('Help & support')} />
        <MenuRow icon="lock" label="Privacy policy" onPress={() => showComingSoon('Privacy policy')} />
        {__DEV__ ? (
          <MenuRow
            icon="star"
            label="Load demo data"
            hint="DEV ONLY"
            onPress={async () => {
              await seedDemoData();
              await loadData();
              Alert.alert(
                'Demo data loaded',
                'Sample stickers, friends, a streak, and 60 coins were added. Check the Book and Pals tabs.'
              );
            }}
          />
        ) : null}
      </View>

      <Text style={styles.footer}>MADE FOR CURIOUS MINDS</Text>
    </ScrollView>
  );
}

function MenuRow({ icon, label, hint, onPress }) {
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
      <PixelPanel style={styles.menuItem}>
        <View style={styles.menuLeft}>
          <View style={styles.iconBadge}>
            <PixelIcon name={icon} size={18} color={COLORS.primary} light={COLORS.sun} />
          </View>
          <View>
            {hint ? <Text style={styles.menuHint}>{hint}</Text> : null}
            <Text style={styles.menuText}>{label}</Text>
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
  footer: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 28,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
