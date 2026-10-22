import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { COLORS, RADIUS, SHADOW } from '../../../theme';
import { PetSprite, PixelSprite, ProgressBar, petSpriteHeight } from '../../../components';
import { successFeedback } from '../../../utils/haptics';
import {
  DECOS,
  FLAG,
  ISLAND_GRID,
  ISLAND_PALETTES,
  ISLAND_STAND_ROW,
  PROPS,
  SEA_ZONES,
  WAVE_GRID,
  zoneIndexOf,
  zoneOf,
} from './seaArt';

/**
 * The home screen's sea: one island per day the goal was met, laid out on a
 * winding path that climbs up the screen. The buddy stands on the latest
 * island it has landed on, and when a new one is earned it hops across like
 * Jump Jump. The water and scenery change as the journey reaches new zones.
 */

const PX = 5; // world pixel
const PROP_PX = 3;
const DECO_PX = 4;
const PET_PX = 3;
const PET_W = 18 * PET_PX;
const ISLAND_W = ISLAND_GRID[0].length * PX;
const ISLAND_H = ISLAND_GRID.length * PX;
const ROW_H = 132;
const TOP_PAD = 120;
const BOTTOM_PAD = 190; // clears the floating tab bar
const PAST_SHOWN = 6;
const FUTURE_SHOWN = 5;
// Duolingo-style zigzag, as a fraction of the swing either side of centre.
const ZIG = [0, 0.55, 0.85, 0.55, 0, -0.55, -0.85, -0.55];
const JUMP_HEIGHT = 115;
const JUMP_SAMPLES = Array.from({ length: 11 }, (_, k) => k / 10);

const WAVE_PALETTES = Object.fromEntries(SEA_ZONES.map((z) => [z.key, { w: z.wave }]));

// A cheap repeatable "random" so the scenery stays put between renders.
const hash = (n) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const Island = memo(function Island({ index, x, y, state }) {
  const zone = zoneOf(index);
  const prop = PROPS[zone.prop];
  const side = index % 2 ? 1 : -1;
  const propW = prop.grid[0].length * PROP_PX;
  const propH = prop.grid.length * PROP_PX;
  return (
    <View
      pointerEvents="none"
      style={[
        styles.island,
        { left: x - ISLAND_W / 2, top: y, opacity: state === 'locked' ? 0.45 : 1 },
      ]}
    >
      <PixelSprite grid={ISLAND_GRID} palette={ISLAND_PALETTES[zone.key]} pixelSize={PX} />
      <PixelSprite
        grid={prop.grid}
        palette={prop.palette}
        pixelSize={PROP_PX}
        style={{
          position: 'absolute',
          left: ISLAND_W / 2 + side * 30 - propW / 2,
          top: (ISLAND_STAND_ROW + 1) * PX - propH,
        }}
      />
      {state === 'won' || index === 0 ? (
        <PixelSprite
          grid={FLAG.grid}
          palette={FLAG.palette}
          pixelSize={PROP_PX}
          style={{ position: 'absolute', left: ISLAND_W / 2 - side * 34, top: -4 * PROP_PX + PX }}
        />
      ) : null}
    </View>
  );
});

export default function SeaMap({
  petIsland,
  reached,
  jumpTo,
  onJumpDone,
  goalMet,
  wordsToday,
  dailyGoal,
  pet,
  speech,
  onSnap,
  reduceMotion = false,
}) {
  const { width } = useWindowDimensions();
  const scrollRef = useRef(null);
  const viewportH = useRef(0);
  const first = Math.max(0, reached - PAST_SHOWN);
  const last = reached + FUTURE_SHOWN;
  const contentH = TOP_PAD + (last - first) * ROW_H + ISLAND_H + BOTTOM_PAD;
  const swing = Math.min(width * 0.26, 120);
  const petH = petSpriteHeight(pet.species, PET_PX);

  const islandX = (i) => width / 2 + ZIG[i % ZIG.length] * swing;
  const islandY = (i) => TOP_PAD + (last - i) * ROW_H;
  const petPoint = (i) => ({
    x: islandX(i) - PET_W / 2 - (i % 2 ? 1 : -1) * 6,
    y: islandY(i) + (ISLAND_STAND_ROW + 1) * PX - petH + PET_PX,
  });

  const scrollToIsland = (i, animated) => {
    const target = islandY(i) + ISLAND_H / 2 - viewportH.current * 0.66;
    scrollRef.current?.scrollTo({ y: Math.max(0, target), animated });
  };

  // ---------- Ambient bobbing for things afloat ----------
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    // Reduce Motion: the sea holds still.
    if (reduceMotion) {
      bob.setValue(0);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [bob, reduceMotion]);
  const bobA = bob.interpolate({ inputRange: [0, 1], outputRange: [0, 4] });
  const bobB = bob.interpolate({ inputRange: [0, 1], outputRange: [3, -1] });

  // ---------- The jump ----------
  const t = useRef(new Animated.Value(0)).current;
  const squash = useRef(new Animated.Value(1)).current;
  const burst = useRef(new Animated.Value(0)).current;
  const toast = useRef(new Animated.Value(0)).current;
  const [leg, setLeg] = useState(null); // { from, to, index, newZone }

  useEffect(() => {
    if (jumpTo == null || jumpTo === petIsland) return;
    const from = petPoint(petIsland);
    const to = petPoint(jumpTo);
    const newZone = zoneIndexOf(jumpTo) !== zoneIndexOf(petIsland) ? zoneOf(jumpTo) : null;
    t.setValue(0);
    burst.setValue(0);
    toast.setValue(0);
    setLeg({ from, to, index: jumpTo, newZone });
    scrollToIsland(jumpTo, !reduceMotion);

    // Reduce Motion: no crouch, arc or splash - the buddy is simply on the
    // new island, and the toast fades in and out.
    const calm = Animated.sequence([
      Animated.timing(toast, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(newZone ? 2200 : 1500),
      Animated.timing(toast, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]);
    if (reduceMotion) {
      t.setValue(1);
      squash.setValue(1);
      calm.start(({ finished }) => {
        if (finished) onJumpDone?.();
      });
      successFeedback();
      return () => calm.stop();
    }

    const anim = Animated.sequence([
      Animated.delay(450),
      // Crouch...
      Animated.timing(squash, { toValue: 0.7, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      // ...and fly.
      Animated.parallel([
        Animated.timing(t, { toValue: 1, duration: 620, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(squash, { toValue: 1.18, duration: 160, useNativeDriver: true }),
          Animated.timing(squash, { toValue: 1, duration: 460, useNativeDriver: true }),
        ]),
      ]),
      // Land with a splash.
      Animated.parallel([
        Animated.sequence([
          Animated.timing(squash, { toValue: 0.75, duration: 90, useNativeDriver: true }),
          Animated.spring(squash, { toValue: 1, friction: 3, tension: 160, useNativeDriver: true }),
        ]),
        Animated.timing(burst, { toValue: 1, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.sequence([
          Animated.spring(toast, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }),
          Animated.delay(newZone ? 1900 : 1100),
          Animated.timing(toast, { toValue: 0, duration: 260, useNativeDriver: true }),
        ]),
      ]),
    ]);
    const landTimer = setTimeout(successFeedback, 450 + 220 + 620);
    anim.start(({ finished }) => {
      if (finished) onJumpDone?.();
    });
    return () => {
      clearTimeout(landTimer);
      anim.stop();
    };
    // Only a new jump target should start a jump.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpTo]);

  // Once the parent has moved the buddy to the island it landed on, the
  // static position takes over again.
  useEffect(() => {
    if (leg && leg.index === petIsland) setLeg(null);
  }, [petIsland, leg]);

  const rest = petPoint(petIsland);
  const petTransform = leg
    ? [
        { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [leg.from.x, leg.to.x] }) },
        {
          translateY: t.interpolate({
            inputRange: JUMP_SAMPLES,
            outputRange: JUMP_SAMPLES.map(
              (s) => leg.from.y + (leg.to.y - leg.from.y) * s - JUMP_HEIGHT * 4 * s * (1 - s)
            ),
          }),
        },
        // Squash from the feet, not the middle.
        { translateY: squash.interpolate({ inputRange: [0, 1], outputRange: [petH / 2, 0] }) },
        { scaleY: squash },
        { translateY: squash.interpolate({ inputRange: [0, 1], outputRange: [-petH / 2, 0] }) },
      ]
    : [{ translateX: rest.x }, { translateY: rest.y }];

  // ---------- Scenery ----------
  const rows = useMemo(() => {
    const out = [];
    for (let i = first; i <= last; i += 1) out.push(i);
    return out;
  }, [first, last]);

  const next = reached + 1;
  const nextX = islandX(next);
  const nextY = islandY(next);
  const speechOnRight = islandX(petIsland) < width / 2;

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.scroll}
      contentContainerStyle={{ height: contentH }}
      showsVerticalScrollIndicator={false}
      onLayout={(e) => {
        const firstLayout = viewportH.current === 0;
        viewportH.current = e.nativeEvent.layout.height;
        if (firstLayout) scrollToIsland(petIsland, false);
      }}
    >
      {/* Water, one band per island so zones change colour as you climb */}
      {rows.map((i) => {
        const mid = islandY(i) + ISLAND_H / 2;
        const top = i === last ? 0 : mid - ROW_H / 2;
        const bottom = i === first ? contentH : mid + ROW_H / 2;
        return (
          <View
            key={`w${i}`}
            style={[styles.band, { top, height: bottom - top, backgroundColor: zoneOf(i).water }]}
          />
        );
      })}

      {/* Waves and things afloat */}
      {rows.map((i) => {
        const zone = zoneOf(i);
        const leftSide = islandX(i) > width / 2;
        const decoKey = zone.decos[i % zone.decos.length];
        const deco = DECOS[decoKey];
        const showDeco = hash(i) > 0.3;
        const decoX = leftSide ? width * (0.06 + hash(i + 9) * 0.16) : width * (0.66 + hash(i + 9) * 0.16);
        const y = islandY(i);
        return (
          <React.Fragment key={`d${i}`}>
            {[0, 1, 2].map((k) => (
              <Animated.View
                key={k}
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: width * hash(i * 3 + k),
                  top: y - 30 + hash(i * 5 + k) * ROW_H * 0.8,
                  transform: [{ translateX: k % 2 ? bobA : bobB }],
                }}
              >
                <PixelSprite grid={WAVE_GRID} palette={WAVE_PALETTES[zone.key]} pixelSize={3} />
              </Animated.View>
            ))}
            {showDeco ? (
              <Animated.View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: decoX,
                  top: y + 6,
                  transform: [{ translateY: i % 2 ? bobA : bobB }],
                }}
              >
                <PixelSprite grid={deco.grid} palette={deco.palette} pixelSize={DECO_PX} />
              </Animated.View>
            ) : null}
          </React.Fragment>
        );
      })}

      {/* Signposts where a new sea begins */}
      {rows
        .filter((i) => i > 0 && zoneIndexOf(i) !== zoneIndexOf(i - 1))
        .map((i) => {
          const zone = zoneOf(i);
          return (
            <View
              key={`z${i}`}
              pointerEvents="none"
              style={[styles.centerRow, { top: islandY(i) + ISLAND_H / 2 + ROW_H / 2 - 17 }]}
            >
              <View style={[styles.sign, { backgroundColor: zone.banner }]}>
                <Text style={styles.signTitle}>{zone.name.toUpperCase()}</Text>
                <Text style={styles.signSub}>
                  {i > reached ? `UNLOCKS AT ISLAND ${i}` : `ISLAND ${i}+`}
                </Text>
              </View>
            </View>
          );
        })}

      {/* Islands */}
      {rows.map((i) => (
        <Island
          key={`i${i}`}
          index={i}
          x={islandX(i)}
          y={islandY(i)}
          state={i <= reached ? 'won' : i === next ? 'next' : 'locked'}
        />
      ))}

      {/* The next island to earn: the call to action */}
      <NextIslandBubble
        x={nextX}
        y={nextY}
        goalMet={goalMet}
        wordsToday={wordsToday}
        dailyGoal={dailyGoal}
        onPress={onSnap}
        bob={bobA}
        still={reduceMotion}
      />

      {/* The buddy */}
      <Animated.View pointerEvents="none" style={[styles.pet, { transform: petTransform }]}>
        <PetSprite
          mood={leg ? 'happy' : pet.mood}
          species={pet.species}
          outfit={pet.outfit}
          pixelSize={PET_PX}
          animate={!leg && !reduceMotion}
        />
      </Animated.View>

      {!leg && speech ? (
        <View
          pointerEvents="none"
          style={[
            styles.speech,
            { top: rest.y - 6 },
            speechOnRight ? { left: rest.x + PET_W + 4 } : { right: width - rest.x + 4 },
          ]}
        >
          <Text style={styles.speechText}>{speech}</Text>
        </View>
      ) : null}

      {/* Landing splash and the "new island" toast */}
      {leg ? (
        <>
          {Array.from({ length: 8 }, (_, k) => {
            const angle = (Math.PI * 2 * k) / 8;
            return (
              <Animated.View
                key={`b${k}`}
                pointerEvents="none"
                style={[
                  styles.spark,
                  {
                    left: leg.to.x + PET_W / 2 - 4,
                    top: leg.to.y + petH - 8,
                    backgroundColor: k % 2 ? COLORS.sun : '#FFFFFF',
                    opacity: burst.interpolate({ inputRange: [0, 0.05, 0.8, 1], outputRange: [0, 1, 1, 0] }),
                    transform: [
                      { translateX: burst.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(angle) * 46] }) },
                      { translateY: burst.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(angle) * 26 - 14] }) },
                    ],
                  },
                ]}
              />
            );
          })}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.centerRow,
              {
                top: leg.to.y - 74,
                zIndex: 7,
                opacity: toast,
                transform: reduceMotion
                  ? []
                  : [{ scale: toast.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
              },
            ]}
          >
            <View
              style={[styles.toast, { backgroundColor: leg.newZone ? leg.newZone.banner : COLORS.leaf }]}
            >
              <Text style={styles.toastTitle}>
                {leg.newZone ? `NEW SEA: ${leg.newZone.name.toUpperCase()}!` : 'GOAL MET! NEW ISLAND!'}
              </Text>
              <Text style={styles.toastSub}>Island {leg.index} reached</Text>
            </View>
          </Animated.View>
        </>
      ) : null}
    </ScrollView>
  );
}

function NextIslandBubble({ x, y, goalMet, wordsToday, dailyGoal, onPress, bob, still }) {
  const W = 132;
  return (
    <Animated.View
      style={[
        styles.bubbleWrap,
        { left: x - W / 2, width: W, top: y - 78, transform: goalMet || still ? [] : [{ translateY: bob }] },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        style={[styles.bubble, goalMet && styles.bubbleDone]}
      >
        <Text style={[styles.bubbleTitle, goalMet && styles.bubbleTitleDone]}>
          {goalMet ? 'NEXT STOP: TOMORROW' : 'SNAP A WORD'}
        </Text>
        {goalMet ? null : (
          <View style={styles.bubbleMeter}>
            <View style={{ flex: 1 }}>
              <ProgressBar
                progress={dailyGoal ? wordsToday / dailyGoal : 0}
                color={COLORS.sun}
                height={9}
                segments={Math.min(Math.max(dailyGoal, 1), 10)}
              />
            </View>
            <Text style={styles.bubbleCount}>
              {wordsToday}/{dailyGoal}
            </Text>
          </View>
        )}
      </TouchableOpacity>
      <View style={[styles.bubbleTail, goalMet && styles.bubbleTailDone]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  band: { position: 'absolute', left: 0, right: 0 },
  island: { position: 'absolute' },
  pet: { position: 'absolute', left: 0, top: 0, zIndex: 5 },
  centerRow: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  sign: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.sm,
    ...SHADOW.soft,
  },
  signTitle: { fontSize: 11, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1.5 },
  signSub: { fontSize: 8, fontWeight: '800', color: '#FFFFFFCC', letterSpacing: 1 },
  speech: {
    position: 'absolute',
    maxWidth: 150,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.md,
    paddingHorizontal: 8,
    paddingVertical: 5,
    zIndex: 6,
    ...SHADOW.soft,
  },
  speechText: { fontSize: 11, fontWeight: '700', color: COLORS.text },
  bubbleWrap: { position: 'absolute', alignItems: 'center', zIndex: 4 },
  bubble: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderWidth: 3,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.md,
    paddingHorizontal: 8,
    paddingVertical: 6,
    ...SHADOW.card,
  },
  bubbleDone: { backgroundColor: '#E9F5E1' },
  bubbleTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.primaryDark,
    letterSpacing: 1,
    textAlign: 'center',
  },
  bubbleTitleDone: { color: COLORS.leafDark, fontSize: 9 },
  bubbleMeter: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  bubbleCount: { fontSize: 11, fontWeight: '900', color: COLORS.text },
  bubbleTail: {
    width: 10,
    height: 10,
    marginTop: -6,
    backgroundColor: COLORS.surface,
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderColor: COLORS.outline,
    transform: [{ rotate: '45deg' }],
  },
  bubbleTailDone: { backgroundColor: '#E9F5E1' },
  spark: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderWidth: 1,
    borderColor: COLORS.outline,
    zIndex: 6,
  },
  toast: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 3,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.md,
    ...SHADOW.card,
  },
  toastTitle: { fontSize: 13, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1 },
  toastSub: { fontSize: 10, fontWeight: '800', color: '#FFFFFFDD', marginTop: 2 },
});
