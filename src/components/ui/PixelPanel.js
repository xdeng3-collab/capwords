import React from 'react';
import { StyleSheet, View } from 'react-native';
import { COLORS, RADIUS, SHADOW } from '../../theme';

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

const styles = StyleSheet.create({
  panel: {
    borderRadius: RADIUS.md,
    borderWidth: 3,
    borderColor: COLORS.outline,
    padding: 14,
    ...SHADOW.card,
  },
});
