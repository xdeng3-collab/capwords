import React, { useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS, SHADOW } from '../../theme';
import { tapFeedback } from '../../utils/haptics';
import PixelIcon from '../pixel/PixelIcon';

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
    tapFeedback();
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

const styles = StyleSheet.create({
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
});
