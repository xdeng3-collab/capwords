import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../theme';
import PetSprite from '../pixel/PetSprite';

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

const styles = StyleSheet.create({
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
});
