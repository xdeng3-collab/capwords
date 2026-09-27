import React from 'react';
import { StyleSheet, View } from 'react-native';
import { COLORS, RADIUS } from '../../theme';

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
