import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, RADIUS, SHADOW } from '../config';
import PixelIcon from './PixelIcon';
import PetSprite from './PetSprite';

/**
 * PixelPanel: a wood/parchment UI panel with a hard pixel border and
 * offset shadow — the base surface for the retro look.
 */
export function PixelPanel({ style, children, tone = 'surface', ...rest }) {
  const bg = tone === 'alt' ? COLORS.surfaceAlt : tone === 'panel' ? COLORS.panel : COLORS.surface;
  return (
    <View style={[styles.panel, { backgroundColor: bg }, style]} {...rest}>
      {children}
    </View>
  );
}

// Backwards-compatible alias used around the app.
export const Card = PixelPanel;

/**
 * PixelButton: a chunky retro button that presses "down" (offset + shadow
 * removal) like a physical key and fires a haptic tap.
 */
export function PixelButton({
  label,
  icon,
  color = COLORS.primary,
  onPress,
  disabled,
  style,
  textStyle,
  size = 'md',
}) {
  const pressed = useRef(new Animated.Value(0)).current;

  const animate = (to) =>
    Animated.timing(pressed, {
      toValue: to,
      duration: 60,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

  const handlePress = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress?.();
  };

  const translateY = pressed.interpolate({ inputRange: [0, 1], outputRange: [0, 3] });
  const sizing = size === 'lg' ? styles.buttonLg : styles.buttonMd;
  const bg = disabled ? COLORS.textMuted : color;

  return (
    <Animated.View style={[{ transform: [{ translateY }] }, style]}>
      <Pressable
        onPressIn={() => animate(1)}
        onPressOut={() => animate(0)}
        onPress={handlePress}
        disabled={disabled}
      >
        <View style={[styles.button, sizing, { backgroundColor: bg }, !disabled && SHADOW.glow]}>
          {icon ? <PixelIcon name={icon} size={16} color="#FBF3E0" style={styles.buttonIcon} /> : null}
          <Text style={[styles.buttonText, textStyle]}>{label}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// Alias so existing screens keep working during the migration.
export const GradientButton = PixelButton;

/**
 * Pill: a small tag with a pixel border and optional icon.
 */
export function Pill({ label, icon, color = COLORS.primary, style }) {
  return (
    <View style={[styles.pill, { borderColor: color, backgroundColor: `${color}22` }, style]}>
      {icon ? <PixelIcon name={icon} size={12} color={color} /> : null}
      <Text style={[styles.pillText, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/**
 * EmptyState: uses the pet sprite as a friendly, on-brand illustration.
 */
export function EmptyState({ mood = 'neutral', title, subtitle, action }) {
  return (
    <View style={styles.emptyWrap}>
      <PetSprite mood={mood} pixelSize={7} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySubtitle}>{subtitle}</Text> : null}
      {action}
    </View>
  );
}

/**
 * ProgressBar: segmented pixel meter that fills in blocky steps.
 */
export function ProgressBar({ progress, color = COLORS.leaf, height = 14, segments = 10 }) {
  const clamped = Math.max(0, Math.min(progress, 1));
  const filled = Math.round(clamped * segments);

  return (
    <View style={[styles.progressTrack, { height }]}>
      {Array.from({ length: segments }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.progressSegment,
            {
              backgroundColor: i < filled ? color : 'transparent',
              borderRightWidth: i < segments - 1 ? 1 : 0,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: RADIUS.md,
    borderWidth: 3,
    borderColor: COLORS.outline,
    padding: 14,
    ...SHADOW.card,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 3,
    borderColor: COLORS.outline,
    gap: 8,
  },
  buttonMd: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  buttonLg: {
    paddingVertical: 15,
    paddingHorizontal: 26,
  },
  buttonIcon: {
    marginRight: 2,
  },
  buttonText: {
    color: '#FBF3E0',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    gap: 5,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.text,
    textAlign: 'center',
    marginTop: 20,
    letterSpacing: 0.5,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 21,
  },
  progressTrack: {
    flexDirection: 'row',
    width: '100%',
    borderWidth: 2,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceAlt,
    overflow: 'hidden',
  },
  progressSegment: {
    flex: 1,
    height: '100%',
    borderRightColor: COLORS.outline,
  },
});
