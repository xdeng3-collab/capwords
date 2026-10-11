import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS } from '../../theme';

/**
 * A health bar that drains smoothly, with a pale "ghost" of the health just
 * lost trailing behind the fill so a big hit reads as big.
 */
export default function HealthBar({ value, max, color = COLORS.leaf, height = 16, dark = false }) {
  const ratio = max > 0 ? Math.max(0, Math.min(value / max, 1)) : 0;
  const fill = useRef(new Animated.Value(ratio)).current;
  const ghost = useRef(new Animated.Value(ratio)).current;

  useEffect(() => {
    Animated.timing(fill, {
      toValue: ratio,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
    Animated.timing(ghost, {
      toValue: ratio,
      duration: 600,
      delay: 220,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [ratio, fill, ghost]);

  const width = (anim) => anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={[styles.track, { height }, dark && styles.trackDark]}>
      <Animated.View style={[styles.fill, styles.ghost, { width: width(ghost) }]} />
      <Animated.View style={[styles.fill, { width: width(fill), backgroundColor: color }]} />
      <Text style={[styles.label, { lineHeight: height - 4 }]}>
        {Math.max(0, Math.ceil(value))} / {max}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    borderWidth: 2,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceAlt,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  trackDark: {
    backgroundColor: '#5A4632',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  ghost: {
    backgroundColor: '#FFFFFF',
    opacity: 0.75,
  },
  label: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.outline,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
