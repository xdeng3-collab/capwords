import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';
import { COLORS, RADIUS, SHADOW } from '../config';
import PixelIcon from './PixelIcon';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const CONFETTI_COLORS = [
  COLORS.sun,
  COLORS.secondary,
  COLORS.leaf,
  COLORS.sky,
  COLORS.berry,
  COLORS.streak,
];

/**
 * Full-screen Duolingo-style celebration shown when the daily goal is hit:
 * pixel confetti rains down while a panel pops in with the streak count.
 * Auto-dismisses after a few seconds, or on tap.
 */
export default function StreakCelebration({ streak = 1, onDone }) {
  const pop = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const dismissed = useRef(false);

  const pieces = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        key: i,
        left: `${4 + Math.random() * 88}%`,
        delay: Math.random() * 600,
        duration: 1600 + Math.random() * 1400,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 7 + Math.round(Math.random() * 6),
        drift: (Math.random() - 0.5) * 90,
        spin: Math.random() > 0.5 ? '360deg' : '-360deg',
        anim: new Animated.Value(0),
      })),
    []
  );

  const dismiss = () => {
    if (dismissed.current) return;
    dismissed.current = true;
    Animated.timing(fade, { toValue: 0, duration: 320, useNativeDriver: true }).start(
      () => onDone?.()
    );
  };

  useEffect(() => {
    Animated.spring(pop, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }).start();
    pieces.forEach((p) =>
      Animated.timing(p.anim, {
        toValue: 1,
        duration: p.duration,
        delay: p.delay,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start()
    );
    const timer = setTimeout(dismiss, 3200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: fade }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />

      {pieces.map((p) => (
        <Animated.View
          key={p.key}
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -20,
            left: p.left,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderWidth: 1,
            borderColor: COLORS.outline,
            transform: [
              {
                translateY: p.anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, SCREEN_HEIGHT * 0.85],
                }),
              },
              {
                translateX: p.anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, p.drift],
                }),
              },
              {
                rotate: p.anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', p.spin],
                }),
              },
            ],
          }}
        />
      ))}

      <Animated.View
        pointerEvents="none"
        style={[
          styles.panel,
          {
            opacity: pop,
            transform: [
              {
                scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }),
              },
            ],
          },
        ]}
      >
        <PixelIcon name="flame" size={44} color={COLORS.streak} light={COLORS.sun} />
        <Text style={styles.streakNumber}>{streak}</Text>
        <Text style={styles.streakLabel}>DAY STREAK</Text>
        <Text style={styles.subtitle}>Daily goal complete — keep it burning!</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(58,42,26,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    elevation: 50,
  },
  panel: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 3,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 34,
    paddingVertical: 26,
    ...SHADOW.card,
  },
  streakNumber: {
    fontSize: 44,
    fontWeight: '900',
    color: COLORS.streak,
    marginTop: 10,
  },
  streakLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 2,
    marginTop: 2,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '700',
    marginTop: 10,
    textAlign: 'center',
  },
});
