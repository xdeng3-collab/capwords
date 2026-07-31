import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, MIN_DAILY_GOAL, MAX_DAILY_GOAL } from '../config';
import { getUserProfile, updateUserProfile, canChangeGoal } from '../services/storageService';

export default function GoalSettingScreen({ navigation }) {
  const [goal, setGoal] = useState(5);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    loadGoal();
  }, []);

  const loadGoal = async () => {
    const profile = await getUserProfile();
    setGoal(profile.dailyGoal);
  };

  const handleSave = async () => {
    const canChange = await canChangeGoal();
    if (!canChange) {
      Alert.alert(
        'Cannot Change Yet',
        'You can only change your daily goal once every 7 days. This helps build consistent habits!',
      );
      return;
    }

    setLoading(true);
    await updateUserProfile({
      dailyGoal: goal,
      lastGoalChange: new Date().toISOString(),
    });
    setLoading(false);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Daily Goal</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.goalDisplay}>
          <Text style={styles.goalNumber}>{goal}</Text>
          <Text style={styles.goalLabel}>words per day</Text>
        </View>

        <View style={styles.sliderContainer}>
          <Text style={styles.sliderLabel}>{MIN_DAILY_GOAL}</Text>
          <View style={styles.slider}>
            <View style={styles.sliderTrack}>
              <View 
                style={[
                  styles.sliderFill, 
                  { width: `${((goal - MIN_DAILY_GOAL) / (MAX_DAILY_GOAL - MIN_DAILY_GOAL)) * 100}%` }
                ]} 
              />
            </View>
            {[1, 5, 10, 15, 20, 30, 50].map((value) => (
              <TouchableOpacity
                key={value}
                style={[styles.sliderDot, goal === value && styles.sliderDotActive]}
                onPress={() => setGoal(value)}
              />
            ))}
          </View>
          <Text style={styles.sliderLabel}>{MAX_DAILY_GOAL}</Text>
        </View>

        {/* Quick presets */}
        <View style={styles.presets}>
          {[3, 5, 10, 15, 20].map((value) => (
            <TouchableOpacity
              key={value}
              style={[styles.presetButton, goal === value && styles.presetButtonActive]}
              onPress={() => setGoal(value)}
            >
              <Text style={[styles.presetText, goal === value && styles.presetTextActive]}>
                {value}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color={COLORS.primary} />
          <Text style={styles.infoText}>
            You can only change your daily goal once a week. Choose a goal that's challenging but achievable to maintain your streak!
          </Text>
        </View>

        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>Recommended Goals:</Text>
          <Text style={styles.tipRow}>🌱 Casual: 3-5 words/day</Text>
          <Text style={styles.tipRow}>📚 Regular: 5-10 words/day</Text>
          <Text style={styles.tipRow}>🔥 Intensive: 10-20 words/day</Text>
          <Text style={styles.tipRow}>🏆 Hardcore: 20+ words/day</Text>
        </View>

        <TouchableOpacity 
          style={[styles.saveButton, loading && styles.saveButtonDisabled]} 
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>Save Goal</Text>
        </TouchableOpacity>
      </View>
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
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: COLORS.surface,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  goalDisplay: {
    alignItems: 'center',
    marginVertical: 30,
  },
  goalNumber: {
    fontSize: 64,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  goalLabel: {
    fontSize: 16,
    color: COLORS.textLight,
    marginTop: 4,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 24,
    gap: 12,
  },
  sliderLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  slider: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
  },
  sliderTrack: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
  },
  sliderFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  sliderDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.border,
  },
  sliderDotActive: {
    backgroundColor: COLORS.primary,
    transform: [{ scale: 1.5 }],
  },
  presets: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  presetButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  presetButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  presetText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  presetTextActive: {
    color: COLORS.primary,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.primary + '10',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 10,
    width: '100%',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: 20,
  },
  tipCard: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 10,
  },
  tipRow: {
    fontSize: 14,
    color: COLORS.textLight,
    paddingVertical: 3,
  },
  saveButton: {
    width: '100%',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
