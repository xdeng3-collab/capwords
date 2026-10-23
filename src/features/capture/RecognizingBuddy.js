import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { PetSprite, PixelSprite } from '../../components';
import { COLORS, RADIUS } from '../../theme';

// What the buddy is "doing" while the photo is recognised. Recognition takes a
// few seconds, so the steps turn the wait into something to watch. They are a
// story, not progress: the last one stays up until the answer arrives.
// Each step is a short title and a detail, one line each, so nothing ever
// breaks mid-phrase and the box keeps its size from step to step.
export function recognizingSteps(languageName) {
  return [
    { title: 'LOOKING CLOSELY', detail: 'at your photo' },
    { title: 'FINDING THE WORD', detail: `in ${languageName}` },
    { title: 'PRACTISING IT', detail: 'so you can hear it' },
    { title: 'ONE FUN FACT', detail: 'coming right up' },
  ];
}

const STEP_MS = 1600;

// A magnifying glass: wooden handle, glass with a glint.
const GLASS = {
  grid: [
    '..OOOO....',
    '.OSSSSO...',
    'OSWSSSSO..',
    'OWSSSSSO..',
    'OSSSSSSO..',
    'OSSSSSSO..',
    '.OSSSSOO..',
    '..OOOOOHH.',
    '.......HHH',
    '........HH',
  ],
  palette: { O: COLORS.outline, S: '#BFE3F5', W: '#FFFFFF', H: COLORS.primary },
};

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
    <View
      style={styles.box}
      accessibilityRole="progressbar"
      accessibilityLabel={`${steps[step].title} ${steps[step].detail}`}
    >
      <View style={styles.stage}>
        <PetSprite
          mood="happy"
          species={pet?.species}
          outfit={pet?.equippedOutfit}
          pixelSize={5}
          animate={!reduceMotion}
        />
        <Animated.View style={[styles.glass, glassMotion]}>
          <PixelSprite grid={GLASS.grid} palette={GLASS.palette} pixelSize={4} />
        </Animated.View>
      </View>
      <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
        {steps[step].title}
      </Text>
      <Text style={styles.detail} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
        {steps[step].detail}
      </Text>
      <View style={styles.dots}>
        {steps.map((_, i) => (
          <View key={i} style={[styles.dot, i <= step && styles.dotOn]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Fixed size: the steps change, the box does not.
  box: {
    width: 220,
    height: 168,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(58,42,26,0.85)',
    borderWidth: 2,
    borderColor: COLORS.sun,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 14,
  },
  stage: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  glass: { marginBottom: 18 },
  title: {
    alignSelf: 'stretch',
    color: '#FBF3E0',
    fontSize: 13,
    marginTop: 10,
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
  },
  detail: {
    alignSelf: 'stretch',
    color: COLORS.sun,
    fontSize: 12,
    marginTop: 2,
    fontWeight: '700',
    textAlign: 'center',
  },
  dots: { flexDirection: 'row', gap: 5, marginTop: 8 },
  dot: { width: 6, height: 6, backgroundColor: 'rgba(251,243,224,0.3)' },
  dotOn: { backgroundColor: COLORS.sun },
});
