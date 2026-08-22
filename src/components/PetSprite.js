import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import PixelSprite from './PixelSprite';

/**
 * A Boing-Boing-style slime companion. Each pet is a squishy pastel blob with
 * animal ears on top (cat / dog / bunny), a glossy highlight, dot eyes, and a
 * signature squash-and-stretch "boing" bounce over a soft ground shadow.
 * No image assets and no emoji — every pixel is a View.
 *
 * Species: 'cat' | 'dog' | 'bunny'
 * Moods:   'happy' | 'content' | 'neutral' | 'sad' | 'sleepy'
 * Outfits: 'none' | 'bow' | 'scarf' | 'cap' | 'crown' (see config OUTFITS)
 */

// Shared palette keys used by every species' grid.
const BASE_PALETTE = {
  o: '#3A2A1A', // outline (dark brown)
  e: '#2E2018', // dot eye
  m: '#3A2A1A', // mouth
  p: '#F2A0AC', // blush
  n: '#E58A96', // tongue
  z: '#8C5A22', // closed-eye line
  t: '#7FB3D9', // tear
  s: 'rgba(58,42,26,0.16)', // ground shadow
};

// Pastel slime colors per species: b = body, h = glossy highlight,
// i = inner ear, d = floppy ear.
const SPECIES_PALETTE = {
  cat: { ...BASE_PALETTE, b: '#F9C784', h: '#FDEBC8', i: '#F2A0AC', d: '#D99E4E' },
  dog: { ...BASE_PALETTE, b: '#E0B27A', h: '#F4DDB8', i: '#8C5A3A', d: '#8C5A3A' },
  bunny: { ...BASE_PALETTE, b: '#F5B8C4', h: '#FBDDE3', i: '#E58A96', d: '#E58A96' },
};

// Ears sit above the shared blob body (18 columns wide).
const HEAD_ROWS = {
  cat: [
    '....oo......oo....',
    '...oiio....oiio...',
    '...obbo....obbo...',
  ],
  dog: [
    '...oo........oo...',
    '..odddo....odddo..',
  ],
  bunny: [
    '....oo......oo....',
    '...oiio....oiio...',
    '...oiio....oiio...',
    '...obbo....obbo...',
  ],
};

// Mood-dependent face rows (identical geometry for every species,
// because the blob body is shared).
const FACES = {
  happy: {
    eyes1: '.obhbebbbbbbebbbo.',
    eyes2: '.obbbebbbbbbebbbo.',
    mouth: 'obbppbbonnobbppbbo', // open smile with tongue
  },
  content: {
    eyes1: '.obhbebbbbbbebbbo.',
    eyes2: '.obbbebbbbbbebbbo.',
    mouth: 'obbppbbbmmbbbppbbo', // little smile + blush
  },
  neutral: {
    eyes1: '.obhbebbbbbbebbbo.',
    eyes2: '.obbbebbbbbbebbbo.',
    mouth: 'obbbbbbbmmbbbbbbbo',
  },
  sad: {
    eyes1: '.obhbobbbbbbobbbo.', // droopy brows
    eyes2: '.obbbebbbbbbetbbo.', // tear
    mouth: 'obbbbbbbmmbbbbbbbo',
  },
  sleepy: {
    eyes1: '.obhbbbbbbbbbbbbo.',
    eyes2: '.obbbzbbbbbbzbbbo.', // closed eyes
    mouth: 'obbppbbbbbbbbppbbo',
  },
};

/** Blob body (8 rows) with mood face; species ears are prepended. */
function bodyGrid(species, mood) {
  const face = FACES[mood] || FACES.neutral;
  const head = HEAD_ROWS[species] || HEAD_ROWS.cat;
  return [
    ...head,
    '..oooooooooooooo..', // blob top
    '.obhhbbbbbbbbbbbo.', // glossy highlight
    face.eyes1,
    face.eyes2,
    face.mouth,
    'obbbbbbbbbbbbbbbbo',
    'obbbbbbbbbbbbbbbbo',
    '.oooooooooooooooo.', // blob bottom
  ];
}

// Soft ground shadow the slime bounces over.
const SHADOW_GRID = ['...ssssssssssss...', '.ssssssssssssssss.'];

/**
 * Outfit overlays. `x` is a column in the 18-wide grid; `y` is relative to
 * the blob's top row (ears occupy negative space), so outfits sit correctly
 * on every species regardless of ear height.
 */
const OUTFIT_SPRITES = {
  bow: {
    x: 6,
    y: -2,
    grid: ['rr..rr', 'rrkkrr', 'rr..rr'],
    palette: { r: '#D96C6C', k: '#B54A4A' },
  },
  scarf: {
    x: 3,
    y: 5,
    grid: ['cccccccccccc', '.........cc.', '........cc..'],
    palette: { c: '#D96C6C' },
  },
  cap: {
    x: 3,
    y: -2,
    grid: ['..bbbbbbbb..', '.bbbbbbbbbb.', 'bbbbbbbbbbbbb'],
    palette: { b: '#5D8FC4' },
  },
  crown: {
    x: 6,
    y: -2,
    grid: ['g.gg.g', 'gggggg'],
    palette: { g: '#F2C14E' },
  },
};

// Boing keyframes: crouch, launch, hang, fall, land-squash, settle.
const KEYS = [0, 0.18, 0.35, 0.5, 0.75, 0.85, 1];
const SCALE_Y = [1, 0.82, 1.08, 1.05, 1, 0.85, 1];
const SCALE_X = [1, 1.14, 0.95, 0.97, 1, 1.12, 1];
const HOP_Y = [0, 3, -10, -14, 0, 3, 0];
const SHADOW_SCALE = [1, 1.06, 0.85, 0.8, 1, 1.06, 1];

const BOUNCE_DURATION = { happy: 1000, content: 1400, neutral: 1600, sad: 2400 };

export default function PetSprite({
  mood = 'neutral',
  species = 'cat',
  outfit = 'none',
  pixelSize = 9,
  animate = true,
}) {
  const boing = useRef(new Animated.Value(0)).current;

  const grid = useMemo(() => bodyGrid(species, mood), [species, mood]);
  const headOffset = (HEAD_ROWS[species] || HEAD_ROWS.cat).length;
  const bodyHeight = grid.length * pixelSize;

  useEffect(() => {
    if (!animate) return undefined;
    boing.setValue(0);
    let loop;
    if (mood === 'sleepy') {
      // No hop while napping — just a slow breathing squish.
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(boing, {
            toValue: 1,
            duration: 2600,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(boing, {
            toValue: 0,
            duration: 2600,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      );
    } else {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(boing, {
            toValue: 1,
            duration: BOUNCE_DURATION[mood] || BOUNCE_DURATION.neutral,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.delay(mood === 'sad' ? 900 : 350),
        ])
      );
    }
    loop.start();
    return () => loop.stop();
  }, [animate, boing, mood]);

  const sleepy = mood === 'sleepy';
  // Sad slimes only manage a half-hearted hop.
  const amp = mood === 'sad' ? 0.35 : 1;

  const scaleY = boing.interpolate({
    inputRange: sleepy ? [0, 1] : KEYS,
    outputRange: sleepy ? [1, 0.94] : SCALE_Y.map((v) => 1 + (v - 1) * amp),
  });
  const scaleX = boing.interpolate({
    inputRange: sleepy ? [0, 1] : KEYS,
    outputRange: sleepy ? [1, 1.04] : SCALE_X.map((v) => 1 + (v - 1) * amp),
  });
  // Keep the blob's bottom pinned to the ground while it squashes:
  // compensate the center-origin scale with a translate.
  const translateY = boing.interpolate({
    inputRange: sleepy ? [0, 1] : KEYS,
    outputRange: sleepy
      ? [0, 0.06 * bodyHeight * 0.5]
      : KEYS.map(
          (_, k) =>
            HOP_Y[k] * amp * (pixelSize / 9) +
            ((1 - (1 + (SCALE_Y[k] - 1) * amp)) * bodyHeight) / 2
        ),
  });
  const shadowScale = boing.interpolate({
    inputRange: sleepy ? [0, 1] : KEYS,
    outputRange: sleepy ? [1, 1.03] : SHADOW_SCALE.map((v) => 1 + (v - 1) * amp),
  });

  const palette = SPECIES_PALETTE[species] || SPECIES_PALETTE.cat;
  const outfitSprite = OUTFIT_SPRITES[outfit];

  return (
    <View style={{ alignItems: 'center' }}>
      <Animated.View
        style={{ transform: [{ translateY }, { scaleX }, { scaleY }], zIndex: 2 }}
      >
        <PixelSprite grid={grid} palette={palette} pixelSize={pixelSize} />
        {outfitSprite ? (
          <PixelSprite
            grid={outfitSprite.grid}
            palette={outfitSprite.palette}
            pixelSize={pixelSize}
            style={{
              position: 'absolute',
              left: outfitSprite.x * pixelSize,
              top: (headOffset + outfitSprite.y) * pixelSize,
            }}
          />
        ) : null}
      </Animated.View>
      <Animated.View style={{ marginTop: -pixelSize, transform: [{ scaleX: shadowScale }] }}>
        <PixelSprite grid={SHADOW_GRID} palette={BASE_PALETTE} pixelSize={pixelSize} />
      </Animated.View>
    </View>
  );
}
