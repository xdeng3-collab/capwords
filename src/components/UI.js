import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS, GRADIENTS, RADIUS, SHADOW } from '../config';

/**
 * A soft, rounded card with a gentle shadow.
 */
export function Card({ style, children, ...rest }) {
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
}

/**
 * Playful gradient button that squishes on press and fires a haptic tap.
 */
export function GradientButton({
  label,
  icon,
  gradient = GRADIENTS.primary,
  onPress,
  disabled,
  style,
  textStyle,
  size = 'md',
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (value) => {
    Animated.spring(scale, {
      toValue: value,
      friction: 6,
      tension: 220,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress?.();
  };

  const sizing = size === 'lg' ? styles.buttonLg : styles.buttonMd;

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPressIn={() => animateTo(0.96)}
        onPressOut={() => animateTo(1)}
        onPress={handlePress}
        disabled={disabled}
        style={({ pressed }) => [pressed && styles.pressedDim]}
      >
        <LinearGradient
          colors={disabled ? [COLORS.textMuted, COLORS.textMuted] : gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.button, sizing, !disabled && SHADOW.glow]}
        >
          {icon ? <Ionicons name={icon} size={20} color="#fff" /> : null}
          <Text style={[styles.buttonText, textStyle]}>{label}</Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

/**
 * Small rounded pill, useful for categories and counters.
 */
export function Pill({ label, emoji, color = COLORS.primary, style }) {
  return (
    <View style={[styles.pill, { backgroundColor: `${color}1A` }, style]}>
      {emoji ? <Text style={styles.pillEmoji}>{emoji}</Text> : null}
      <Text style={[styles.pillText, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/**
 * A friendly empty-state illustration built from emoji + copy.
 */
export function EmptyState({ emoji, title, subtitle, action }) {
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [float]);

  const translateY = float.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  return (
    <View style={styles.emptyWrap}>
      <Animated.View style={[styles.emptyBubble, { transform: [{ translateY }] }]}>
        <Text style={styles.emptyEmoji}>{emoji}</Text>
      </Animated.View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySubtitle}>{subtitle}</Text> : null}
      {action}
    </View>
  );
}

/**
 * Animated progress bar with rounded caps.
 */
export function ProgressBar({ progress, color = COLORS.primary, height = 10, trackColor }) {
  const width = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(width, {
      toValue: Math.max(0, Math.min(progress, 1)),
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress, width]);

  return (
    <View
      style={[
        styles.progressTrack,
        { height, borderRadius: height / 2, backgroundColor: trackColor || COLORS.border },
      ]}
    >
      <Animated.View
        style={{
          height: '100%',
          borderRadius: height / 2,
          backgroundColor: color,
          width: width.interpolate({
            inputRange: [0, 1],
            outputRange: ['0%', '100%'],
          }),
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 16,
    ...SHADOW.soft,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.pill,
    gap: 8,
  },
  buttonMd: {
    paddingVertical: 14,
    paddingHorizontal: 22,
  },
  buttonLg: {
    paddingVertical: 17,
    paddingHorizontal: 28,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  pressedDim: {
    opacity: 0.9,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    gap: 5,
  },
  pillEmoji: {
    fontSize: 13,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyBubble: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    ...SHADOW.card,
  },
  emptyEmoji: {
    fontSize: 52,
  },
  emptyTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  progressTrack: {
    width: '100%',
    overflow: 'hidden',
  },
});
