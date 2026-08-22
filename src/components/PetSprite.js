import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import PixelSprite from './PixelSprite';

/**
 * An original, hand-authored pixel companion (cat or dog). No image assets and
 * no emoji — every pixel is a View. The pet shows different expressions based
 * on its mood, can wear outfits, and gently bobs to feel alive.
 *
 * Species: 'cat' | 'dog'
 * Moods:   'happy' | 'content' | 'neutral' | 'sad' | 'sleepy'
 * Outfits: 'none' | 'bow' | 'scarf' | 'cap' | 'crown' (see config OUTFITS)
 */

// Shared palette keys used by both species' grids.
const BASE_PALETTE = {
  o: '#3A2A1A', // outline (dark brown)
  c: '#FFF3DC', // cream muzzle / belly
  p: '#F2A0AC', // pink blush
  w: '#FFFFFF', // eye sparkle
  e: '#2E2018', // eye
  z: '#8C5A22', // closed-eye line
  t: '#7FB3D9', // tear
  l: '#F3F7FB', // cloud
  s: '#D7E6F2', // cloud shade
};

const SPECIES_PALETTE = {
  cat: {
    ...BASE_PALETTE,
    f: '#F6C177', // fur base (soft orange)
    d: '#D99E4E', // fur shade
    i: '#F2A0AC', // inner ear pink
    n: '#E58A96', // pink nose
  },
  dog: {
    ...BASE_PALETTE,
    f: '#D9A566', // fur base (light brown)
    d: '#8C5A3A', // floppy ears (dark brown)
    i: '#8C5A3A',
    n: '#4A3826', // dark nose
  },
};

// Cloud the pet sits on (shared across species).
const CLOUD = [
  '.....llll.....',
  '...llllllll...',
  '.llllllllllll.',
  'llllllllllllll',
  '.llssllllssll.',
];

/**
 * Mood-dependent face rows for each species. Rows are:
 *   eyes1, eyes2 (two rows of big sparkly eyes)
 *   cheeks (blush + nose row)
 *   mouth
 */
const FACES = {
  cat: {
    happy: {
      eyes1: 'offewfffffewfffo',
      eyes2: 'offeefffffeefffo',
      cheeks: 'ofppffcnncffppfo',
      mouth: 'offffconnocffffo', // open smile with tongue
    },
    content: {
      eyes1: 'offewfffffewfffo',
      eyes2: 'offeefffffeefffo',
      cheeks: 'ofppffcnncffppfo',
      mouth: 'offffcoccocffffo', // little smile
    },
    neutral: {
      eyes1: 'offewfffffewfffo',
      eyes2: 'offeefffffeefffo',
      cheeks: 'offfffcnncfffffo',
      mouth: 'offffccooccffffo',
    },
    sad: {
      eyes1: 'offoofffffoofffo', // droopy brows
      eyes2: 'offeefffffeefffo',
      cheeks: 'offfffcnncfftffo', // tear
      mouth: 'offffccooccffffo',
    },
    sleepy: {
      eyes1: 'offffffffffffffo',
      eyes2: 'offzzfffffzzfffo', // closed eyes
      cheeks: 'ofppffcnncffppfo',
      mouth: 'offffccccccffffo',
    },
  },
  dog: {
    happy: {
      eyes1: 'oddofewffewfoddo',
      eyes2: 'oddofeeffeefoddo',
      cheeks: 'oddopfcnncfpoddo',
      mouth: '.ooofconnocfooo.',
    },
    content: {
      eyes1: 'oddofewffewfoddo',
      eyes2: 'oddofeeffeefoddo',
      cheeks: 'oddopfcnncfpoddo',
      mouth: '.ooofcoccocfooo.',
    },
    neutral: {
      eyes1: 'oddofewffewfoddo',
      eyes2: 'oddofeeffeefoddo',
      cheeks: 'oddoffcnncffoddo',
      mouth: '.ooofccooccfooo.',
    },
    sad: {
      eyes1: 'oddofooffoofoddo',
      eyes2: 'oddofeeffeefoddo',
      cheeks: 'oddoffcnncftoddo',
      mouth: '.ooofccooccfooo.',
    },
    sleepy: {
      eyes1: 'oddoffffffffoddo',
      eyes2: 'oddofzzffzzfoddo',
      cheeks: 'oddopfcnncfpoddo',
      mouth: '.ooofccccccfooo.',
    },
  },
};

/** Full 16-wide body grid per species; face rows vary by mood. */
function bodyGrid(species, mood) {
  const face = (FACES[species] || FACES.cat)[mood] || FACES[species || 'cat'].neutral;

  if (species === 'dog') {
    return [
      '....oooooooo....',
      '..ooffffffffoo..',
      '.oddffffffffddo.', // floppy ears start
      'oddoffffffffoddo',
      'oddoffffffffoddo',
      face.eyes1,
      face.eyes2,
      face.cheeks,
      face.mouth, // ears end here
      '..offfccccfffo..',
      '.offffffffffffo.',
      '.offccccccccffo.', // belly
      '..offccccccffo..',
      '...ooffffffoo...',
      '.....oooooo.....',
    ];
  }

  // cat
  return [
    '..oo........oo..', // ear tips
    '.ofio......oifo.', // pointy ears with pink inner
    '.offooooooooffo.',
    '.offffffffffffo.',
    'offffffffffffffo',
    face.eyes1,
    face.eyes2,
    face.cheeks,
    face.mouth,
    'offfffccccfffffo',
    '.offffffffffffo.',
    '.offccccccccffo.', // belly
    '..offccccccffo..',
    '...ooffffffoo...',
    '.....oooooo.....',
  ];
}

/**
 * Outfit overlays, positioned in the pet's 16-wide grid space.
 * `x`/`y` are grid-cell offsets from the sprite's top-left corner.
 */
const OUTFIT_SPRITES = {
  bow: {
    x: 5,
    y: 0,
    grid: ['rr..rr', 'rrkkrr', 'rr..rr'],
    palette: { r: '#D96C6C', k: '#B54A4A' },
  },
  scarf: {
    x: 2,
    y: 10,
    grid: ['ssssssssssss', '.........ss.', '........ss..'],
    palette: { s: '#D96C6C' },
  },
  cap: {
    x: 2,
    y: 0,
    grid: ['..bbbbbbbb..', '.bbbbbbbbbb.', 'bbbbbbbbbbbbb'],
    palette: { b: '#5D8FC4' },
  },
  crown: {
    x: 5,
    y: 0,
    grid: ['g.gg.g', 'gggggg'],
    palette: { g: '#F2C14E' },
  },
};

export default function PetSprite({
  mood = 'neutral',
  species = 'cat',
  outfit = 'none',
  pixelSize = 9,
  animate = true,
}) {
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

  const palette = SPECIES_PALETTE[species] || SPECIES_PALETTE.cat;
  const outfitSprite = OUTFIT_SPRITES[outfit];

  return (
    <View style={{ alignItems: 'center' }}>
      <Animated.View style={{ transform: [{ translateY }], zIndex: 2 }}>
        <PixelSprite grid={bodyGrid(species, mood)} palette={palette} pixelSize={pixelSize} />
        {outfitSprite ? (
          <PixelSprite
            grid={outfitSprite.grid}
            palette={outfitSprite.palette}
            pixelSize={pixelSize}
            style={{
              position: 'absolute',
              left: outfitSprite.x * pixelSize,
              top: outfitSprite.y * pixelSize,
            }}
          />
        ) : null}
      </Animated.View>
      <View style={{ marginTop: -pixelSize * 2 }}>
        <PixelSprite grid={CLOUD} palette={BASE_PALETTE} pixelSize={pixelSize} />
      </View>
    </View>
  );
}
