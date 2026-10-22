import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { PixelSprite } from '../../../components';
import { HALO, SPARKLE } from './seaArt';

/**
 * The milestone halo: a golden ring floating over the buddy's head with a few
 * glints twinkling around it. Drawn inside the buddy's own box (`width` x
 * `height`), so it follows every hop and jump.
 */

const GLINTS = [
  { x: -0.12, y: 0.15, phase: 0 },
  { x: 1.02, y: 0.05, phase: 0.33 },
  { x: 0.98, y: 0.6, phase: 0.66 },
];

export default function Halo({ width, height, pixelSize = 3, still = false }) {
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Reduce Motion: the halo just sits there.
    if (still) {
      float.setValue(0);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.timing(float, { toValue: 1, duration: 2400, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [float, still]);

  const haloW = HALO.grid[0].length * pixelSize;
  const haloH = HALO.grid.length * pixelSize;
  const bob = float.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -3, 0] });

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width, height }}>
      <Animated.View
        style={{
          position: 'absolute',
          left: (width - haloW) / 2,
          top: -haloH - 2,
          transform: [{ translateY: still ? 0 : bob }],
        }}
      >
        <PixelSprite grid={HALO.grid} palette={HALO.palette} pixelSize={pixelSize} />
      </Animated.View>
      {GLINTS.map((g, k) => (
        <Animated.View
          key={k}
          style={{
            position: 'absolute',
            left: g.x * width,
            top: g.y * height,
            opacity: still
              ? 1
              : float.interpolate({
                  inputRange: [0, g.phase, g.phase + 0.15, g.phase + 0.3, 1],
                  outputRange: [0, 0, 1, 0, 0],
                }),
          }}
        >
          <PixelSprite grid={SPARKLE.grid} palette={SPARKLE.palette} pixelSize={2} />
        </Animated.View>
      ))}
    </View>
  );
}
