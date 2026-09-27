import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, RADIUS } from '../../theme';
import PixelIcon from '../pixel/PixelIcon';

/**
 * The framed left arrow at the top of a pushed screen. Callers decide what
 * "back" means - usually navigation.goBack().
 */
export function BackButton({ onPress, style }) {
  return (
    <TouchableOpacity style={[styles.button, style]} onPress={onPress} hitSlop={10}>
      <PixelIcon name="arrowLeft" size={18} color={COLORS.text} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    borderColor: COLORS.outline,
    padding: 8,
  },
});
