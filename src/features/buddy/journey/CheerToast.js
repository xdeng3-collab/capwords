import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, RADIUS, SHADOW } from '../../../theme';
import { PixelIcon } from '../../../components';

/**
 * "Mia cheered you on!" - drops in over the sea, then tucks itself away.
 * Tapping it opens Pals.
 */
export default function CheerToast({ message, onPress, onHidden }) {
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.sequence([
      Animated.spring(slide, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
      Animated.delay(4200),
      Animated.timing(slide, { toValue: 0, duration: 260, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]);
    anim.start(({ finished }) => finished && onHidden?.());
    return () => anim.stop();
  }, [slide, onHidden]);

  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          opacity: slide,
          transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }],
        },
      ]}
    >
      <TouchableOpacity style={styles.toast} activeOpacity={0.85} onPress={onPress}>
        <View style={styles.heart}>
          <PixelIcon name="heart" size={16} color="#FFFFFF" />
        </View>
        <Text style={styles.text} numberOfLines={2}>
          {message}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 104, left: 0, right: 0, alignItems: 'center', zIndex: 10 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    maxWidth: '88%',
    paddingVertical: 9,
    paddingLeft: 9,
    paddingRight: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 3,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.lg,
    ...SHADOW.card,
  },
  heart: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.secondary,
    borderWidth: 2,
    borderColor: COLORS.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flexShrink: 1, fontSize: 14, fontWeight: '900', color: COLORS.text },
});
