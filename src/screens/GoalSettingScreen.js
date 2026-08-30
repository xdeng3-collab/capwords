import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, MIN_DAILY_GOAL, MAX_DAILY_GOAL, RADIUS, SHADOW } from '../config';
import { PixelPanel, PixelButton, ProgressBar } from '../components/UI';
import { useAlert } from '../components/PixelAlert';
import PixelIcon from '../components/PixelIcon';
import { getUserProfile, updateUserProfile, canChangeGoal } from '../services/storageService';

const PRESETS = [3, 5, 10, 15, 20];

const TIPS = [
  { icon: 'seed', label: 'Casual', range: '3-5 words/day' },
  { icon: 'book', label: 'Regular', range: '5-10 words/day' },
  { icon: 'flame', label: 'Intensive', range: '10-20 words/day' },
  { icon: 'trophy', label: 'Hardcore', range: '20+ words/day' },
];

export default function GoalSettingScreen({ navigation }) {
  const showAlert = useAlert();
  const [goal, setGoal] = useState(5);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const profile = await getUserProfile();
      setGoal(profile.dailyGoal);
    })();
  }, []);

  const changeGoal = (value) => {
    const next = Math.min(Math.max(value, MIN_DAILY_GOAL), MAX_DAILY_GOAL);
    if (next !== goal) {
      Haptics.selectionAsync().catch(() => {});
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
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setLoading(false);
    navigation.goBack();
  };

  const progress = (goal - MIN_DAILY_GOAL) / (MAX_DAILY_GOAL - MIN_DAILY_GOAL);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} hitSlop={10}>
          <PixelIcon name="arrowLeft" size={18} color={COLORS.text} />
        </TouchableOpacity>
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
            <PixelIcon name="plus" size={22} color={goal >= MAX_DAILY_GOAL ? COLORS.textMuted : COLORS.primaryDark} />
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
            return (
              <TouchableOpacity
                key={value}
                style={[styles.presetButton, active && styles.presetButtonActive]}
                onPress={() => changeGoal(value)}
                activeOpacity={0.85}
              >
                <Text style={[styles.presetText, active && styles.presetTextActive]}>{value}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <PixelPanel style={styles.infoCard}>
          <Text style={styles.infoText}>
            You can change your goal once a week. Pick something challenging but doable so your
            streak keeps growing.
          </Text>
        </PixelPanel>

        <PixelPanel style={styles.tipCard}>
          <Text style={styles.tipTitle}>RECOMMENDED GOALS</Text>
          {TIPS.map((tip) => (
            <View key={tip.label} style={styles.tipRow}>
              <View style={styles.tipIcon}>
                <PixelIcon name={tip.icon} size={16} color={COLORS.primary} light={COLORS.sun} />
              </View>
              <Text style={styles.tipLabel}>{tip.label}</Text>
              <Text style={styles.tipRange}>{tip.range}</Text>
            </View>
          ))}
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
  backButton: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    borderColor: COLORS.outline,
    padding: 8,
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
  infoCard: { width: '100%', marginBottom: 14, backgroundColor: COLORS.surfaceAlt },
  infoText: { fontSize: 13, color: COLORS.textLight, lineHeight: 20, fontWeight: '600' },
  tipCard: { width: '100%', marginBottom: 24 },
  tipTitle: { fontSize: 13, fontWeight: '900', color: COLORS.text, marginBottom: 12, letterSpacing: 0.8 },
  tipRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 10 },
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
