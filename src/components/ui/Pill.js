import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS } from '../../theme';
import PixelIcon from '../pixel/PixelIcon';

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

const styles = StyleSheet.create({
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
});
