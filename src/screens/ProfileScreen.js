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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, GRADIENTS, LANGUAGES, RADIUS, SHADOW } from '../config';
import { Card } from '../components/UI';
import {
  getUserProfile,
  updateUserProfile,
  getStreak,
  getSubscription,
  getStickers,
  canChangeGoal,
} from '../services/storageService';

const PLAN_LABELS = {
  free: { title: 'Free Plan', detail: '3 free words each day', emoji: '🌱' },
  per_word: { title: 'Pay Per Word', detail: 'Word pack balance', emoji: '🎟️' },
  monthly: { title: 'Monthly Pro', detail: 'Unlimited words', emoji: '⭐' },
  yearly: { title: 'Yearly Pro', detail: 'Unlimited words', emoji: '👑' },
};

export default function ProfileScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [streak, setStreak] = useState({ current: 0, longest: 0 });
  const [subscription, setSubscription] = useState(null);
  const [totalWords, setTotalWords] = useState(0);

  const loadData = useCallback(async () => {
    const [p, s, sub, stickers] = await Promise.all([
      getUserProfile(),
      getStreak(),
      getSubscription(),
      getStickers(),
    ]);

    setProfile(p);
    setStreak(s);
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
      Alert.alert(
        'Not just yet 🗓️',
        'You can change your daily goal once a week. This keeps your habit nice and steady!'
      );
      return;
    }
    navigation.navigate('GoalSetting');
  };

  const showComingSoon = (feature) =>
    Alert.alert(`${feature}`, 'This is coming in a future update. Thanks for your patience! 💜');

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
    { label: 'Words', value: totalWords, emoji: '📚' },
    { label: 'Streak', value: streak.current, emoji: '🔥' },
    { label: 'Best', value: streak.longest, emoji: '🏆' },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={GRADIENTS.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.avatarRing}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        </View>
        <Text style={styles.userName}>{profile.name}</Text>
        <Text style={styles.userSubtext}>
          Learning {targetLang?.flag} {targetLang?.name}
        </Text>

        <View style={styles.statsRow}>
          {stats.map((stat) => (
            <View key={stat.label} style={styles.statBox}>
              <Text style={styles.statEmoji}>{stat.emoji}</Text>
              <Text style={styles.statNumber}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {/* Subscription */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your plan</Text>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => navigation.navigate('Subscription')}
        >
          <Card style={styles.planCard}>
            <View style={styles.planLeft}>
              <View style={styles.planEmojiWrap}>
                <Text style={styles.planEmoji}>{plan.emoji}</Text>
              </View>
              <View style={styles.planTextWrap}>
                <Text style={styles.planTitle}>{plan.title}</Text>
                <Text style={styles.planDetail}>{planDetail}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={19} color={COLORS.textMuted} />
          </Card>
        </TouchableOpacity>
      </View>

      {/* Learning settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Learning</Text>

        <MenuRow
          emoji="🎯"
          label={`${profile.dailyGoal} words per day`}
          hint="Daily goal"
          onPress={handleChangeGoal}
        />

        <MenuRow
          emoji={targetLang?.flag || '🌍'}
          label={targetLang?.name || 'Choose a language'}
          hint="Target language"
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
        <Text style={styles.sectionTitle}>More</Text>
        <MenuRow emoji="⚙️" label="App settings" onPress={() => showComingSoon('App settings')} />
        <MenuRow
          emoji="💬"
          label="Help & support"
          onPress={() => showComingSoon('Help & support')}
        />
        <MenuRow
          emoji="🔒"
          label="Privacy policy"
          onPress={() => showComingSoon('Privacy policy')}
        />
      </View>

      <Text style={styles.footer}>Made with 💜 for curious minds</Text>
    </ScrollView>
  );
}

/** A single rounded settings row with an emoji badge. */
function MenuRow({ emoji, label, hint, onPress }) {
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
      <Card style={styles.menuItem}>
        <View style={styles.menuLeft}>
          <View style={styles.menuEmojiWrap}>
            <Text style={styles.menuEmoji}>{emoji}</Text>
          </View>
          <View>
            {hint ? <Text style={styles.menuHint}>{hint}</Text> : null}
            <Text style={styles.menuText}>{label}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={19} color={COLORS.textMuted} />
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  header: {
    paddingTop: 64,
    paddingBottom: 26,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
  },
  avatarRing: {
    padding: 4,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  avatar: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 27,
    fontWeight: '800',
    color: COLORS.primary,
  },
  userName: {
    fontSize: 23,
    fontWeight: '800',
    color: '#fff',
    marginTop: 12,
  },
  userSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.88)',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    marginTop: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statEmoji: {
    fontSize: 17,
  },
  statNumber: {
    fontSize: 21,
    fontWeight: '800',
    color: '#fff',
    marginTop: 3,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 1,
    fontWeight: '600',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 10,
    marginLeft: 4,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    flex: 1,
  },
  planEmojiWrap: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.sm,
    backgroundColor: `${COLORS.sunny}22`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planEmoji: {
    fontSize: 21,
  },
  planTextWrap: {
    flex: 1,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  planDetail: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingVertical: 13,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    flex: 1,
  },
  menuEmojiWrap: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  menuEmoji: {
    fontSize: 19,
  },
  menuHint: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  menuText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  footer: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 28,
    fontWeight: '600',
  },
});
