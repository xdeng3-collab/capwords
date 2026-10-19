import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS, SHADOW } from '../../../theme';
import { PixelIcon } from '../../../components';

export const PHOTO_SIZE = 40;

/**
 * A pin that shows the newest photo taken there, with a count when there are
 * more. Used on the drawn globe and on the system map alike.
 */
export default function PhotoPin({ items, style }) {
  const count = items.length;
  const [newest] = items;
  return (
    <View style={[styles.pin, style]}>
      {newest.imageUri ? (
        <Image source={{ uri: newest.imageUri }} style={styles.photo} />
      ) : (
        <View style={styles.fallback}>
          <PixelIcon name="star" size={18} color={COLORS.primary} />
        </View>
      )}
      {count > 1 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pin: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.sm,
    ...SHADOW.soft,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    minWidth: 18,
    paddingHorizontal: 3,
    alignItems: 'center',
    backgroundColor: COLORS.sun,
    borderWidth: 2,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.sm,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.text,
  },
});
