import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { PetSprite, PixelIcon } from '../../components';
import { COLORS, RADIUS } from '../../theme';

// What the buddy is "doing" while the photo is recognised. Recognition takes a
// few seconds, so the steps turn the wait into something to watch. They are a
// story, not progress: the last one stays up until the answer arrives.
export function recognizingSteps(languageName) {
  return [
    'Taking a close look...',
    `Finding the word in ${languageName}...`,
    'Practising how to say it...',
    'Writing you a fun fact...',
  ];
}

const STEP_MS = 1600;

/**
 * The buddy with a magnifying glass over the frozen photo while a word is
 * being found. Presentational: the camera screen decides when it shows.
 */
export default function RecognizingBuddy({ pet, languageName, reduceMotion = false }) {
  const steps = recognizingSteps(languageName);
  const [step, setStep] = useState(0);
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((s) => Math.min(s + 1, steps.length - 1));
    }, STEP_MS);
    return () => clearInterval(timer);
  }, [steps.length]);

  useEffect(() => {
    if (reduceMotion) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sweep, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(sweep, {
          toValue: 0,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [reduceMotion, sweep]);

  // The glass sweeps side to side and dips, like it is reading the photo.
  const glassMotion = {
    transform: [
      { translateX: sweep.interpolate({ inputRange: [0, 1], outputRange: [-10, 10] }) },
      { translateY: sweep.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -6, 0] }) },
    ],
  };

  return (
    <View style={styles.box} accessibilityRole="progressbar" accessibilityLabel={steps[step]}>
      <View style={styles.stage}>
        <PetSprite
          mood="happy"
          species={pet?.species}
          outfit={pet?.equippedOutfit}
          pixelSize={5}
          animate={!reduceMotion}
        />
        <Animated.View style={[styles.glass, glassMotion]}>
          <PixelIcon name="search" size={28} color={COLORS.sun} light="#FBF3E0" />
        </Animated.View>
      </View>
      <Text style={styles.text}>{steps[step].toUpperCase()}</Text>
      <View style={styles.dots}>
        {steps.map((_, i) => (
          <View key={i} style={[styles.dot, i <= step && styles.dotOn]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    backgroundColor: 'rgba(58,42,26,0.85)',
    borderWidth: 2,
    borderColor: COLORS.sun,
    borderRadius: RADIUS.sm,
    paddingVertical: 14,
    paddingHorizontal: 16,
    maxWidth: 240,
  },
  stage: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  glass: { marginBottom: 18 },
  text: {
    color: '#FBF3E0',
    fontSize: 12,
    marginTop: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  dots: { flexDirection: 'row', gap: 5, marginTop: 8 },
  dot: { width: 6, height: 6, backgroundColor: 'rgba(251,243,224,0.3)' },
  dotOn: { backgroundColor: COLORS.sun },
});
