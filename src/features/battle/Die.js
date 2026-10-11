import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS, SHADOW } from '../../theme';

// Which of the nine pip positions (a 3x3 grid, row by row) each face lights.
const PIPS = {
  1: [4],
  2: [2, 6],
  3: [2, 4, 6],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

/**
 * One die. Tap to keep it out of the next reroll; a kept die lifts and turns
 * gold. While `rolling`, a die that is not kept rattles.
 */
export default function Die({ value, held, rolling, disabled, size = 54, onPress }) {
  const rattle = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!rolling || held) {
      rattle.setValue(0);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(rattle, { toValue: 1, duration: 70, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(rattle, { toValue: -1, duration: 70, easing: Easing.linear, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [rolling, held, rattle]);

  useEffect(() => {
    Animated.spring(lift, { toValue: held ? 1 : 0, friction: 6, tension: 140, useNativeDriver: true }).start();
  }, [held, lift]);

  const rotate = rattle.interpolate({ inputRange: [-1, 1], outputRange: ['-14deg', '14deg'] });
  const hop = rattle.interpolate({ inputRange: [-1, 0, 1], outputRange: [-5, 0, -5] });
  const translateY = Animated.add(hop, lift.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }));
  const pip = Math.round(size * 0.17);

  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={4}>
      <Animated.View
        style={[
          styles.die,
          { width: size, height: size, transform: [{ translateY }, { rotate }] },
          held && styles.dieHeld,
        ]}
      >
        <View style={styles.pips}>
          {Array.from({ length: 9 }).map((_, i) => (
            <View key={i} style={styles.pipCell}>
              {PIPS[value]?.includes(i) ? (
                <View
                  style={{
                    width: pip,
                    height: pip,
                    backgroundColor: value === 6 ? COLORS.secondary : COLORS.outline,
                  }}
                />
              ) : null}
            </View>
          ))}
        </View>
      </Animated.View>
      <Text style={[styles.keep, !held && styles.keepHidden]}>KEEP</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  die: {
    backgroundColor: COLORS.surface,
    borderWidth: 3,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.lg,
    padding: 5,
    ...SHADOW.card,
  },
  dieHeld: {
    backgroundColor: '#FFE9A6',
    borderColor: COLORS.primaryDark,
  },
  pips: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  pipCell: {
    width: '33.33%',
    height: '33.33%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keep: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
    color: COLORS.primaryDark,
    textAlign: 'center',
    marginTop: 2,
  },
  keepHidden: {
    opacity: 0,
  },
});
