import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, MIN_DAILY_GOAL, MAX_DAILY_GOAL, RADIUS, SHADOW } from '../config';
import { Card, GradientButton, ProgressBar } from '../components/UI';
import { getUserProfile, updateUserProfile, canChangeGoal } from '../services/storageService';

const PRESETS = [3, 5, 10, 15, 20];

const TIPS = [
  { emoji: '🌱', label: 'Casual', range: '3-5 words/day' },
  { emoji: '📚', label: 'Regular', range: '5-10 words/day' },
  { emoji: '🔥', label: 'Intensive', range: '10-20 words/day' },
  { emoji: '🏆', label: 'Hardcore', range: '20+ words/day' },
];

export default function GoalSettingScreen({ navigation }) {
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
      Alert.alert(
        'Not just yet 🗓️',
        'You can change your daily goal once every 7 days. This helps build a steady habit!'
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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={10}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Daily goal</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Big number with steppers */}
        <View style={styles.goalDisplay}>
          <TouchableOpacity
            style={styles.stepper}
            onPress={() => changeGoal(goal - 1)}
            disabled={goal <= MIN_DAILY_GOAL}
          >
            <Ionicons
              name="remove"
              size={24}
              color={goal <= MIN_DAILY_GOAL ? COLORS.textMuted : COLORS.primary}
            />
          </TouchableOpacity>

          <View style={styles.goalNumberWrap}>
            <Text style={styles.goalNumber}>{goal}</Text>
            <Text style={styles.goalLabel}>words / day</Text>
          </View>

          <TouchableOpacity
            style={styles.stepper}
            onPress={() => changeGoal(goal + 1)}
            disabled={goal >= MAX_DAILY_GOAL}
          >
            <Ionicons
              name="add"
              size={24}
              color={goal >= MAX_DAILY_GOAL ? COLORS.textMuted : COLORS.primary}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.sliderRow}>
          <Text style={styles.sliderLabel}>{MIN_DAILY_GOAL}</Text>
          <View style={styles.sliderTrackWrap}>
            <ProgressBar progress={progress} height={8} />
          </View>
          <Text style={styles.sliderLabel}>{MAX_DAILY_GOAL}</Text>
        </View>

        {/* Quick presets */}
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
                <Text style={[styles.presetText, active && styles.presetTextActive]}>
                  {value}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Card style={styles.infoCard}>
          <Text style={styles.infoEmoji}>💡</Text>
          <Text style={styles.infoText}>
            You can change your goal once a week. Pick something challenging but doable so
            your streak keeps growing!
          </Text>
        </Card>

        <Card style={styles.tipCard}>
          <Text style={styles.tipTitle}>Recommended goals</Text>
          {TIPS.map((tip) => (
            <View key={tip.label} style={styles.tipRow}>
              <Text style={styles.tipEmoji}>{tip.emoji}</Text>
              <Text style={styles.tipLabel}>{tip.label}</Text>
              <Text style={styles.tipRange}>{tip.range}</Text>
            </View>
          ))}
        </Card>

        <GradientButton
          label={loading ? 'Saving…' : 'Save goal'}
          icon="checkmark-circle"
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
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
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
    borderRadius: RADIUS.pill,
    padding: 9,
    ...SHADOW.soft,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    padding: 22,
    paddingBottom: 130,
    alignItems: 'center',
  },
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
    borderRadius: 26,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.soft,
  },
  goalNumberWrap: {
    alignItems: 'center',
  },
  goalNumber: {
    fontSize: 62,
    fontWeight: '800',
    color: COLORS.primary,
    lineHeight: 68,
  },
  goalLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 12,
    marginBottom: 22,
  },
  sliderTrackWrap: {
    flex: 1,
  },
  sliderLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '700',
  },
  presets: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  presetButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    ...SHADOW.soft,
  },
  presetButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}12`,
  },
  presetText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textLight,
  },
  presetTextActive: {
    color: COLORS.primary,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    width: '100%',
    marginBottom: 14,
    backgroundColor: `${COLORS.primary}0D`,
  },
  infoEmoji: {
    fontSize: 18,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: 20,
  },
  tipCard: {
    width: '100%',
    marginBottom: 24,
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 12,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 10,
  },
  tipEmoji: {
    fontSize: 17,
  },
  tipLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  tipRange: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  saveButton: {
    width: '100%',
  },
});
