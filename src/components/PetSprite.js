import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import PixelSprite from './PixelSprite';

/**
 * An original, hand-authored pixel hamster companion. No image assets and no
 * emoji — every pixel is a View. The pet shows different expressions based on
 * its mood and gently bobs / breathes to feel alive.
 *
 * Moods: 'happy' | 'content' | 'neutral' | 'sad' | 'sleepy'
 */

// Shared palette for the hamster body.
const PALETTE = {
  o: '#3A2A1A', // outline (dark brown)
  b: '#E8B873', // body base (tan)
  d: '#C98A3B', // body shade
  c: '#FBF3E0', // cream belly / cheeks highlight
  p: '#E59AA8', // pink cheeks
  n: '#8C5A22', // nose / inner ear
  w: '#FFFFFF', // eye white
  e: '#3A2A1A', // eye
  l: '#F3F7FB', // cloud
  s: '#D7E6F2', // cloud shade
};

// Cloud the pet sits on (shared across moods).
const CLOUD = [
  '.....llll.....',
  '...llllllll...',
  '.llllllllllll.',
  'llllllllllllll',
  'llllssllsslll l',
  '.llssllllssll.',
];

/** Face rows differ per mood; body silhouette stays consistent. */
function bodyGrid(mood) {
  // Eyes and mouth region (rows 5-8) vary by mood.
  let eyesRow;
  let cheekRow;
  let mouthRow;

  switch (mood) {
    case 'happy':
      eyesRow = '.o.wewe.wewe.o.'; // wide bright eyes
      cheekRow = 'o.bppb.bb.bppb.o';
      mouthRow = '..d..onno..d..'; // big smile
      break;
    case 'content':
      eyesRow = '.o.oeo..oeo..o.';
      cheekRow = 'o.bppb.bb.bppb.o';
      mouthRow = '..d...nn...d..'; // small smile
      break;
    case 'sad':
      eyesRow = '.o..oe..eo...o.'; // droopy eyes
      cheekRow = 'o.bdb.bbbb.bdb.o';
      mouthRow = '..d..nono..d..'; // frown
      break;
    case 'sleepy':
      eyesRow = '.o.====.====.o.'; // closed eyes
      cheekRow = 'o.bppb.bb.bppb.o';
      mouthRow = '..d....o....d..';
      break;
    case 'neutral':
    default:
      eyesRow = '.o.oeo..oeo..o.';
      cheekRow = 'o.bdb.bbbb.bdb.o';
      mouthRow = '..d...oo...d..';
      break;
  }

  return [
    '....oooooo....',
    '..oobbbbbboo..',
    '.obnbbbbbbnbo.', // ears (inner n)
    '.obbbbbbbbbbo.',
    '.obbbbbbbbbbo.',
    eyesRow,
    '.obbbbbbbbbbo.',
    cheekRow,
    mouthRow,
    '.obbccccccbbo.', // belly
    '.obccccccccbo.',
    '..obbccccbbo..',
    '...oobbbboo...',
    '.....oooo.....',
  ];
}

const MOOD_PALETTE = (mood) => {
  const p = { ...PALETTE };
  if (mood === 'sleepy') p['='] = '#8C5A22'; // closed-eye line
  return p;
};

export default function PetSprite({ mood = 'neutral', pixelSize = 9, animate = true }) {
  const bob = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animate) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          toValue: 1,
          duration: mood === 'sleepy' ? 2600 : 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration: mood === 'sleepy' ? 2600 : 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [animate, bob, mood]);

  const translateY = bob.interpolate({
    inputRange: [0, 1],
    outputRange: [0, mood === 'sad' ? -2 : -6],
  });

  return (
    <View style={{ alignItems: 'center' }}>
      <Animated.View style={{ transform: [{ translateY }], zIndex: 2 }}>
        <PixelSprite grid={bodyGrid(mood)} palette={MOOD_PALETTE(mood)} pixelSize={pixelSize} />
      </Animated.View>
      <View style={{ marginTop: -pixelSize * 2 }}>
        <PixelSprite grid={CLOUD} palette={PALETTE} pixelSize={pixelSize} />
      </View>
    </View>
  );
}
