import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { COLORS, SHADOW } from '../config';
import { ProgressBar } from '../components/UI';
import PetSprite from '../components/PetSprite';

// The buddy waking up. Nothing moves position between these — the meter
// fills, the sprite wakes, the caption changes. When the app boots fast the
// user only ever sees the last frame, which is why it also reads as a splash.
const STAGES = [
  { mood: 'sleepy', progress: 0.2 },
  { mood: 'content', progress: 0.6 },
  { mood: 'happy', progress: 1 },
];

const STAGE_MS = 420;

// Confetti along the bottom band, in the same retro palette as the stickers.
const CONFETTI = [
  { left: '9%', top: 22, color: COLORS.secondary },
  { left: '25%', top: 40, color: COLORS.accent },
  { left: '43%', top: 20, color: COLORS.sun },
  { left: '63%', top: 44, color: COLORS.berry },
  { left: '82%', top: 24, color: COLORS.water },
];

/**
 * Shown while the app reads its stored data. `petName` personalises the first
 * caption; `onSettled` fires once the meter has filled, so the wake-up always
 * plays out rather than flashing past on a fast boot.
 */
export default function LoadingScreen({ petName = 'your buddy', ready = true, onSettled }) {
  const [stage, setStage] = useState(0);
  const fade = useRef(new Animated.Value(0)).current;

  const captions = [`Waking ${petName}…`, 'Counting your stickers…', 'Ready!'];

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [fade]);

  useEffect(() => {
    if (stage >= STAGES.length - 1) return undefined;
    const timer = setTimeout(() => setStage((s) => s + 1), STAGE_MS);
    return () => clearTimeout(timer);
  }, [stage]);

  // Leave only once the meter is full *and* the data is in.
  useEffect(() => {
    if (stage < STAGES.length - 1 || !ready) return undefined;
    const timer = setTimeout(() => onSettled?.(), STAGE_MS);
    return () => clearTimeout(timer);
  }, [stage, ready, onSettled]);

  const current = STAGES[stage];

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.middle, { opacity: fade }]}>
        <View style={styles.wordmarkBlock}>
          <Text style={styles.wordmark}>CAPWORDS</Text>
          <Text style={styles.tagline}>SNAP IT · LEARN IT</Text>
        </View>

        <PetSprite mood={current.mood} pixelSize={9} />

        <View style={styles.meterBlock}>
          <ProgressBar
            progress={current.progress}
            color={COLORS.leaf}
            height={16}
            segments={10}
          />
          <Text style={styles.caption}>{captions[stage]}</Text>
        </View>
      </Animated.View>

      <View style={styles.footer}>
        {CONFETTI.map((c, i) => (
          <View
            key={i}
            style={[styles.confetti, { left: c.left, top: c.top, backgroundColor: c.color }]}
          />
        ))}
        <Text style={styles.version}>V 1.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  middle: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 30,
    paddingHorizontal: 44,
  },
  wordmarkBlock: { alignItems: 'center', gap: 10 },
  wordmark: {
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 2,
    color: COLORS.text,
  },
  tagline: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 3,
    color: COLORS.textMuted,
  },
  meterBlock: { alignItems: 'center', gap: 14, width: '100%' },
  caption: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.6,
    color: COLORS.textLight,
  },
  footer: {
    height: 84,
    backgroundColor: COLORS.panel,
    borderTopWidth: 3,
    borderTopColor: COLORS.outline,
    ...SHADOW.soft,
  },
  confetti: { position: 'absolute', width: 6, height: 6 },
  version: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 14,
    textAlign: 'center',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2,
    color: COLORS.textMuted,
  },
});
