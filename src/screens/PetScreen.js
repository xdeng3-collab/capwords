import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { COLORS, PET, PET_MOODS, RADIUS, SHADOW } from '../config';
import { PixelPanel, PixelButton, ProgressBar } from '../components/UI';
import PetSprite from '../components/PetSprite';
import PixelIcon from '../components/PixelIcon';
import { getPetState, namePet } from '../services/storageService';

export default function PetScreen({ navigation }) {
  const [state, setState] = useState(null);
  const [renaming, setRenaming] = useState(false);
  const [nameInput, setNameInput] = useState('');

  const load = useCallback(async () => {
    const petState = await getPetState();
    setState(petState);
    // First launch: prompt the user to name their new companion.
    if (!petState.named) {
      setNameInput('');
      setRenaming(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const saveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    await namePet(trimmed);
    setRenaming(false);
    load();
  };

  if (!state) {
    return <View style={styles.container} />;
  }

  const mood = PET_MOODS[state.mood] || PET_MOODS.neutral;
  const progress = state.dailyGoal > 0 ? state.wordsToday / state.dailyGoal : 0;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Title bar */}
        <View style={styles.titleBar}>
          <Text style={styles.title}>MY BUDDY</Text>
          <TouchableOpacity
            style={styles.renameChip}
            onPress={() => {
              setNameInput(state.name);
              setRenaming(true);
            }}
          >
            <PixelIcon name="gear" size={14} color={COLORS.textLight} />
            <Text style={styles.renameChipText}>RENAME</Text>
          </TouchableOpacity>
        </View>

        {/* Pet stage */}
        <PixelPanel tone="panel" style={styles.stage}>
          <View style={styles.skyStrip} />
          <PetSprite mood={state.mood} pixelSize={12} />
          <Text style={styles.petName}>{state.name}</Text>
          <Text style={styles.petMood}>{state.name} {mood.label}</Text>

          <View style={styles.speech}>
            <Text style={styles.speechText}>{mood.line}</Text>
          </View>
        </PixelPanel>

        {/* Daily goal meter */}
        <PixelPanel style={styles.card}>
          <View style={styles.cardHeader}>
            <PixelIcon name="target" size={16} color={COLORS.primary} />
            <Text style={styles.cardTitle}>TODAY'S GOAL</Text>
            <Text style={styles.cardCount}>
              {state.wordsToday}/{state.dailyGoal}
            </Text>
          </View>
          <ProgressBar progress={progress} color={state.goalReached ? COLORS.leaf : COLORS.sun} />
          <Text style={styles.cardHint}>
            {state.goalReached
              ? `${state.name} is thrilled — goal complete!`
              : `Learn ${Math.max(state.dailyGoal - state.wordsToday, 0)} more to make ${state.name} happy.`}
          </Text>
        </PixelPanel>

        {/* Streak */}
        <View style={styles.statsRow}>
          <PixelPanel style={styles.statCard}>
            <PixelIcon name="flame" size={20} color={COLORS.streak} light={COLORS.sun} />
            <Text style={styles.statNumber}>{state.streak}</Text>
            <Text style={styles.statLabel}>DAY STREAK</Text>
          </PixelPanel>
          <PixelPanel style={styles.statCard}>
            <PixelIcon name="trophy" size={20} color={COLORS.primary} light={COLORS.sun} />
            <Text style={styles.statNumber}>{state.longestStreak}</Text>
            <Text style={styles.statLabel}>BEST STREAK</Text>
          </PixelPanel>
        </View>

        <PixelButton
          label={`Feed ${state.name} a word`}
          icon="camera"
          color={COLORS.leaf}
          size="lg"
          style={styles.cta}
          onPress={() => navigation.navigate('Camera')}
        />
      </ScrollView>

      {/* Name / rename modal */}
      <Modal visible={renaming} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <PixelPanel style={styles.modalCard}>
            <View style={styles.modalPet}>
              <PetSprite mood="content" pixelSize={7} animate={false} />
            </View>
            <Text style={styles.modalTitle}>
              {state.named ? 'RENAME YOUR BUDDY' : 'NAME YOUR NEW BUDDY'}
            </Text>
            <Text style={styles.modalSubtitle}>
              Give your pixel pal a name to begin your journey together.
            </Text>
            <TextInput
              style={styles.input}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder={PET.defaultName}
              placeholderTextColor={COLORS.textMuted}
              maxLength={PET.maxNameLength}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={saveName}
            />
            <View style={styles.modalButtons}>
              {state.named ? (
                <PixelButton
                  label="Cancel"
                  color={COLORS.textMuted}
                  style={styles.modalButton}
                  onPress={() => setRenaming(false)}
                />
              ) : null}
              <PixelButton
                label="Confirm"
                icon="check"
                color={COLORS.leaf}
                style={styles.modalButton}
                onPress={saveName}
                disabled={!nameInput.trim()}
              />
            </View>
          </PixelPanel>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    padding: 18,
    paddingTop: 60,
    paddingBottom: 130,
  },
  titleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 2,
  },
  renameChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 2,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: COLORS.surface,
  },
  renameChipText: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.textLight,
    letterSpacing: 0.8,
  },
  stage: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 14,
    overflow: 'hidden',
  },
  skyStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
    backgroundColor: COLORS.sky,
    opacity: 0.4,
  },
  petName: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.text,
    marginTop: 16,
    letterSpacing: 1,
  },
  petMood: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textLight,
    marginTop: 2,
  },
  speech: {
    marginTop: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 9,
    maxWidth: '90%',
  },
  speechText: {
    fontSize: 13,
    color: COLORS.text,
    textAlign: 'center',
    fontWeight: '600',
  },
  card: {
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.textLight,
    letterSpacing: 1,
  },
  cardCount: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.primary,
  },
  cardHint: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 10,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 18,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
  },
  statNumber: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.text,
    marginTop: 6,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.textLight,
    letterSpacing: 0.8,
    marginTop: 2,
  },
  cta: {
    marginTop: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(58,42,26,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  modalCard: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 22,
  },
  modalPet: {
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 1,
    marginTop: 8,
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
    lineHeight: 19,
    paddingHorizontal: 8,
  },
  input: {
    width: '100%',
    borderWidth: 3,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 16,
    ...SHADOW.soft,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalButton: {
    flex: 1,
  },
});
