import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';
import { COLORS } from '../config';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CONFETTI_COLORS = [
  COLORS.primary,
  COLORS.secondary,
  COLORS.sunny,
  COLORS.mint,
  COLORS.sky,
  COLORS.peach,
];

/**
 * A single confetti piece that falls, drifts sideways and spins.
 */
function Piece({ delay, startX, color, size, drift }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 1600 + delay,
      delay,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [delay, progress]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-40, 420],
  });

  const translateX = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, drift, drift * 0.4],
  });

  const rotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${drift > 0 ? 540 : -540}deg`],
  });

  const opacity = progress.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [1, 1, 0],
  });

  return (
    <Animated.View
      style={[
        styles.piece,
        {
          left: startX,
          width: size,
          height: size * 0.5,
          backgroundColor: color,
          opacity,
          transform: [{ translateY }, { translateX }, { rotate }],
        },
      ]}
    />
  );
}

/**
 * Lightweight confetti burst. Renders nothing when `active` is false so it
 * costs nothing during normal use.
 */
export default function Confetti({ active, count = 18 }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }).map((_, index) => ({
        key: `${index}`,
        delay: Math.random() * 260,
        startX: Math.random() * SCREEN_WIDTH,
        color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
        size: 8 + Math.random() * 8,
        drift: (Math.random() - 0.5) * 140,
      })),
    [count, active]
  );

  if (!active) return null;

  return (
    <View pointerEvents="none" style={styles.container}>
      {pieces.map(({ key, ...piece }) => (
        <Piece key={key} {...piece} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
  },
  piece: {
    position: 'absolute',
    top: 0,
    borderRadius: 3,
  },
});
