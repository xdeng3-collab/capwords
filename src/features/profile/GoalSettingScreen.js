import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { MIN_DAILY_GOAL, MAX_DAILY_GOAL, ROUTES } from '../../config';
import { COLORS, RADIUS, SHADOW } from '../../theme';
import {
  BackButton,
  PixelButton,
  PixelIcon,
  PixelPanel,
  ProgressBar,
  useAlert,
} from '../../components';
import { canChangeGoal, getUserProfile, updateUserProfile } from '../../services/profileService';
import { getGoalCap } from '../../services/subscriptionService';
import { refreshWidget } from '../../services/widgetService';
import { selectFeedback, successFeedback } from '../../utils/haptics';

const PRESETS = [3, 5, 10, 15, 20];

// Tapping one sets the goal to its value.
const TIPS = [
  { icon: 'seed', label: 'Casual', value: 3 },
  { icon: 'star', label: 'Regular', value: 5 },
  { icon: 'flame', label: 'Intensive', value: 10 },
  { icon: 'trophy', label: 'Hardcore', value: 20 },
];

export default function GoalSettingScreen({ navigation }) {
  const showAlert = useAlert();
  const [goal, setGoal] = useState(3);
  // null = no cap. A free plan cannot learn past its daily words, so goals
  // above that are shown locked rather than set and never reached.
  const [cap, setCap] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const [profile, goalCap] = await Promise.all([getUserProfile(), getGoalCap()]);
      setGoal(profile.dailyGoal);
      setCap(goalCap);
    })();
  }, []);

  const maxGoal = cap ?? MAX_DAILY_GOAL;
  const isLocked = (value) => cap != null && value > cap;

  const showProHint = () =>
    showAlert(
      'Goals above ' + cap + ' need Pro',
      `The free plan learns ${cap} words a day, so a bigger goal could never be met. Go Pro for unlimited words and any goal you like.`,
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'See plans', onPress: () => navigation.navigate(ROUTES.SUBSCRIPTION) },
      ]
    );

  const changeGoal = (value) => {
    if (isLocked(value)) {
      showProHint();
      return;
    }
    const next = Math.min(Math.max(value, MIN_DAILY_GOAL), maxGoal);
    if (next !== goal) {
      selectFeedback();
      setGoal(next);
    }
  };

  const handleSave = async () => {
    const canChange = await canChangeGoal();
    if (!canChange) {
      showAlert(
        'Not just yet',
        'You can change your daily goal once every 7 days. This helps build a steady habit.'
      );
      return;
    }

    setLoading(true);
    await updateUserProfile({
      dailyGoal: goal,
      lastGoalChange: new Date().toISOString(),
    });
    successFeedback();
    // The widget draws its pips and its whole state off the goal, so it goes
    // stale the moment the goal changes. Nothing else takes the user out of the
    // app here, so the foreground refresh in App.js would not fire on its own.
    refreshWidget();
    setLoading(false);
    navigation.goBack();
  };

  const progress = (goal - MIN_DAILY_GOAL) / (MAX_DAILY_GOAL - MIN_DAILY_GOAL);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.title}>DAILY GOAL</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.goalDisplay}>
          <TouchableOpacity
            style={styles.stepper}
            onPress={() => changeGoal(goal - 1)}
            disabled={goal <= MIN_DAILY_GOAL}
          >
            <PixelIcon name="minus" size={22} color={goal <= MIN_DAILY_GOAL ? COLORS.textMuted : COLORS.primaryDark} />
          </TouchableOpacity>

          <View style={styles.goalNumberWrap}>
            <Text style={styles.goalNumber}>{goal}</Text>
            <Text style={styles.goalLabel}>WORDS / DAY</Text>
          </View>

          <TouchableOpacity
            style={styles.stepper}
            onPress={() => changeGoal(goal + 1)}
            disabled={goal >= MAX_DAILY_GOAL}
          >
            <PixelIcon
              name={isLocked(goal + 1) ? 'lock' : 'plus'}
              size={22}
              color={goal >= maxGoal ? COLORS.textMuted : COLORS.primaryDark}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.sliderRow}>
          <Text style={styles.sliderLabel}>{MIN_DAILY_GOAL}</Text>
          <View style={styles.sliderTrackWrap}>
            <ProgressBar progress={progress} color={COLORS.sun} />
          </View>
          <Text style={styles.sliderLabel}>{MAX_DAILY_GOAL}</Text>
        </View>

        <View style={styles.presets}>
          {PRESETS.map((value) => {
            const active = goal === value;
            const locked = isLocked(value);
            return (
              <TouchableOpacity
                key={value}
                style={[
                  styles.presetButton,
                  active && styles.presetButtonActive,
                  locked && styles.presetButtonLocked,
                ]}
                onPress={() => changeGoal(value)}
                activeOpacity={0.85}
                accessibilityLabel={locked ? `${value} words, needs Pro` : `${value} words`}
              >
                <Text style={[styles.presetText, active && styles.presetTextActive, locked && styles.lockedText]}>
                  {value}
                </Text>
                {locked ? <Text style={styles.proTag}>PRO</Text> : null}
              </TouchableOpacity>
            );
          })}
        </View>

        <PixelPanel style={styles.infoCard}>
          <Text style={styles.infoText}>
            {cap != null
              ? `Free plan: up to ${cap} words a day, so goals go up to ${cap}. You can change your goal once a week.`
              : 'You can change your goal once a week. Pick something challenging but doable so your streak keeps growing.'}
          </Text>
        </PixelPanel>

        <PixelPanel style={styles.tipCard}>
          <Text style={styles.tipTitle}>RECOMMENDED GOALS</Text>
          {TIPS.map((tip) => {
            const locked = isLocked(tip.value);
            const active = goal === tip.value;
            return (
              <TouchableOpacity
                key={tip.label}
                style={[styles.tipRow, active && styles.tipRowActive]}
                onPress={() => changeGoal(tip.value)}
                activeOpacity={0.7}
              >
                <View style={styles.tipIcon}>
                  <PixelIcon name={tip.icon} size={16} color={COLORS.primary} light={COLORS.sun} />
                </View>
                <Text style={[styles.tipLabel, locked && styles.lockedText]}>{tip.label}</Text>
                {locked ? <Text style={styles.proTagInline}>PRO</Text> : null}
                <Text style={[styles.tipRange, locked && styles.lockedText]}>
                  {tip.value} words/day
                </Text>
              </TouchableOpacity>
            );
          })}
        </PixelPanel>

        <PixelButton
          label={loading ? 'Saving...' : 'Save goal'}
          icon="check"
          color={COLORS.leaf}
          onPress={handleSave}
          disabled={loading}
          size="lg"
          style={styles.saveButton}
        />
      </ScrollView>
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
  content: { padding: 22, paddingBottom: 130, alignItems: 'center' },
  goalDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 14,
    marginBottom: 22,
  },
  stepper: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 3,
    borderColor: COLORS.outline,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.soft,
  },
  goalNumberWrap: { alignItems: 'center' },
  goalNumber: { fontSize: 60, fontWeight: '900', color: COLORS.primaryDark, lineHeight: 66 },
  goalLabel: { fontSize: 12, color: COLORS.textLight, fontWeight: '900', letterSpacing: 1 },
  sliderRow: { flexDirection: 'row', alignItems: 'center', width: '100%', gap: 12, marginBottom: 22 },
  sliderTrackWrap: { flex: 1 },
  sliderLabel: { fontSize: 13, color: COLORS.textMuted, fontWeight: '900' },
  presets: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  presetButton: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.outline,
    ...SHADOW.soft,
  },
  presetButtonActive: { backgroundColor: COLORS.sun },
  presetText: { fontSize: 16, fontWeight: '900', color: COLORS.textLight },
  presetTextActive: { color: COLORS.primaryDark },
  presetButtonLocked: { backgroundColor: COLORS.surfaceAlt, borderColor: COLORS.outlineSoft },
  lockedText: { color: COLORS.textMuted },
  proTag: {
    position: 'absolute',
    top: -9,
    right: -6,
    fontSize: 8,
    fontWeight: '900',
    color: '#FFFFFF',
    backgroundColor: COLORS.berry,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    letterSpacing: 0.5,
  },
  proTagInline: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
    backgroundColor: COLORS.berry,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    letterSpacing: 0.5,
  },
  infoCard: { width: '100%', marginBottom: 14, backgroundColor: COLORS.surfaceAlt },
  infoText: { fontSize: 13, color: COLORS.textLight, lineHeight: 20, fontWeight: '600' },
  tipCard: { width: '100%', marginBottom: 24 },
  tipTitle: { fontSize: 13, fontWeight: '900', color: COLORS.text, marginBottom: 12, letterSpacing: 0.8 },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 6,
    marginHorizontal: -6,
    gap: 10,
    borderRadius: RADIUS.md,
  },
  tipRowActive: { backgroundColor: `${COLORS.sun}55` },
  tipIcon: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 2,
    borderColor: COLORS.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipLabel: { flex: 1, fontSize: 14, fontWeight: '900', color: COLORS.text },
  tipRange: { fontSize: 12, color: COLORS.textLight, fontWeight: '700' },
  saveButton: { width: '100%' },
});
