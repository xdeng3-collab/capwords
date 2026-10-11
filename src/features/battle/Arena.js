import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { BATTLE } from '../../config';
import { COLORS, RADIUS } from '../../theme';
import { PetSprite, PixelSprite, PoopSprite } from '../../components';
import { errorFeedback, pressFeedback, successFeedback } from '../../utils/haptics';
import { biomeForLevel, effectFor } from './effects';
import { monsterSprite } from './monsterSprites';

const GROUND = 46; // height of the grass + dirt strip
const EDGE = 16; // gap between a fighter and the arena wall
const PET_PIXEL = 5;
const PET_WIDTH = 18 * PET_PIXEL;
const POOP_PIXEL = 2;
const POOP_SIZE = 12 * POOP_PIXEL;
const ARC_HEIGHT = 64;
const TRAIL = [0.05, 0.1, 0.15, 0.2, 0.25]; // how far behind each spark flies
const BURST_COUNT = 10;
const STEPS = 10;

const run = (animation) => new Promise((resolve) => animation.start(() => resolve()));

// Fixed "random" spots for clouds and stars, as fractions of the sky.
const SKY_DOTS = [
  [0.08, 0.16, 26],
  [0.3, 0.34, 18],
  [0.52, 0.1, 30],
  [0.7, 0.4, 16],
  [0.86, 0.22, 22],
];
const STARS = [
  [0.05, 0.12],
  [0.16, 0.42],
  [0.27, 0.2],
  [0.38, 0.5],
  [0.47, 0.08],
  [0.58, 0.32],
  [0.66, 0.16],
  [0.78, 0.46],
  [0.9, 0.1],
  [0.95, 0.36],
];

/**
 * The battlefield: the buddy on the left, the monster on the right, and every
 * animation between them. It owns no rules - the screen decides what happens
 * and calls throwPoop() / monsterAttack() / defeatMonster() through the ref,
 * each of which resolves when its animation has landed.
 */
const Arena = forwardRef(function Arena(
  { level, monster, boss, species, outfit, effect, petMood = 'content', style },
  ref
) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [hit, setHit] = useState(null); // { damage, crit, combo } shown over the monster
  const [ouch, setOuch] = useState(0); // damage shown over the buddy

  const flight = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current;
  const hitFloat = useRef(new Animated.Value(0)).current;
  const ouchFloat = useRef(new Animated.Value(0)).current;
  const banner = useRef(new Animated.Value(0)).current;
  const monsterShake = useRef(new Animated.Value(0)).current;
  const monsterLunge = useRef(new Animated.Value(0)).current;
  const monsterBlink = useRef(new Animated.Value(1)).current;
  const monsterGone = useRef(new Animated.Value(0)).current;
  const monsterBob = useRef(new Animated.Value(0)).current;
  const petToss = useRef(new Animated.Value(0)).current;
  const petShake = useRef(new Animated.Value(0)).current;
  const redFlash = useRef(new Animated.Value(0)).current;
  const quake = useRef(new Animated.Value(0)).current;
  const drift = useRef(new Animated.Value(0)).current;

  const biome = biomeForLevel(level, BATTLE.bossEvery);
  const colors = effectFor(effect);
  const sprite = useMemo(() => monsterSprite(monster.id, monster.tier), [monster.id, monster.tier]);

  // Bosses are drawn bigger; everything shrinks a notch on a narrow phone.
  const monsterPixel = (boss ? 7 : 6) - (size.width && size.width < 330 ? 1 : 0);
  const monsterWidth = sprite.grid[0].length * monsterPixel;
  const monsterHeight = sprite.grid.length * monsterPixel;
  const flies = monster.id === 'bat' || monster.id === 'ghost';
  const monsterBottom = GROUND - 10 + (flies ? 22 : 0);

  useEffect(() => {
    const bob = Animated.loop(
      Animated.sequence([
        Animated.timing(monsterBob, {
          toValue: 1,
          duration: flies ? 520 : 800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(monsterBob, {
          toValue: 0,
          duration: flies ? 520 : 800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    const clouds = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 9000, easing: Easing.linear, useNativeDriver: true }),
      ])
    );
    bob.start();
    clouds.start();
    return () => {
      bob.stop();
      clouds.stop();
    };
  }, [monsterBob, drift, flies]);

  // Where a poop leaves the buddy and where it lands, as top-left corners.
  const path = useMemo(() => {
    const x0 = EDGE + PET_WIDTH - 14;
    const y0 = size.height - GROUND - 50;
    const x1 = size.width - EDGE - monsterWidth / 2 - POOP_SIZE / 2;
    const y1 = size.height - monsterBottom - monsterHeight / 2 - POOP_SIZE / 2;
    const at = (t) => ({
      x: x0 + (x1 - x0) * t,
      y: y0 + (y1 - y0) * t - 4 * ARC_HEIGHT * t * (1 - t),
    });
    // Position along the arc for something `lag` behind the poop.
    const track = (lag) => {
      const input = [];
      const points = [];
      if (lag > 0) {
        input.push(0);
        points.push(at(0));
      }
      for (let i = 0; i <= STEPS; i += 1) {
        const t = i / STEPS;
        if (t + lag > 1) break;
        input.push(t + lag);
        points.push(at(t));
      }
      if (input[input.length - 1] < 1) {
        input.push(1);
        points.push(at(1 - lag));
      }
      return {
        translateX: flight.interpolate({ inputRange: input, outputRange: points.map((p) => p.x) }),
        translateY: flight.interpolate({ inputRange: input, outputRange: points.map((p) => p.y) }),
      };
    };
    return { track, end: at(1) };
  }, [size, monsterWidth, monsterHeight, monsterBottom, flight]);

  const bursts = useMemo(
    () =>
      Array.from({ length: BURST_COUNT }, (_, i) => {
        const angle = (i / BURST_COUNT) * Math.PI * 2 + (i % 2 ? 0.2 : -0.1);
        const reach = 34 + (i % 3) * 14;
        return {
          dx: Math.cos(angle) * reach,
          dy: Math.sin(angle) * reach,
          size: 6 + (i % 3) * 2,
          color: i,
        };
      }),
    []
  );

  useImperativeHandle(ref, () => ({
    /** The buddy throws; resolves once the poop has hit and the monster reeled. */
    async throwPoop({ damage, crit, combo }) {
      setHit({ damage, crit, combo });
      banner.setValue(0);
      Animated.sequence([
        Animated.spring(banner, { toValue: 1, friction: 5, tension: 160, useNativeDriver: true }),
        Animated.delay(500),
        Animated.timing(banner, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
      Animated.sequence([
        Animated.timing(petToss, { toValue: 1, duration: 110, useNativeDriver: true }),
        Animated.timing(petToss, { toValue: 0, duration: 160, useNativeDriver: true }),
      ]).start();

      flight.setValue(0);
      await run(
        Animated.timing(flight, {
          toValue: 1,
          duration: 460,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      flight.setValue(0);

      if (crit) successFeedback();
      else pressFeedback();
      burst.setValue(0);
      hitFloat.setValue(0);
      Animated.timing(hitFloat, {
        toValue: 1,
        duration: 850,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
      const wobble = (to) =>
        Animated.timing(monsterShake, { toValue: to, duration: 45, useNativeDriver: true });
      const blink = (to) =>
        Animated.timing(monsterBlink, { toValue: to, duration: 60, useNativeDriver: true });
      await run(
        Animated.parallel([
          Animated.timing(burst, {
            toValue: 1,
            duration: 380,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.sequence([wobble(1), wobble(-1), wobble(0.6), wobble(-0.6), wobble(0)]),
          Animated.sequence([blink(0.25), blink(1), blink(0.25), blink(1)]),
          ...(crit
            ? [
                Animated.sequence([
                  Animated.timing(quake, { toValue: 1, duration: 40, useNativeDriver: true }),
                  Animated.timing(quake, { toValue: -1, duration: 40, useNativeDriver: true }),
                  Animated.timing(quake, { toValue: 0, duration: 40, useNativeDriver: true }),
                ]),
              ]
            : []),
        ])
      );
    },

    /** The monster lunges at the buddy; resolves when it is back in place. */
    async monsterAttack(damage) {
      await run(
        Animated.timing(monsterLunge, {
          toValue: 1,
          duration: 170,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        })
      );
      errorFeedback();
      setOuch(damage);
      ouchFloat.setValue(0);
      Animated.timing(ouchFloat, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
      const jolt = (value, to) =>
        Animated.timing(value, { toValue: to, duration: 45, useNativeDriver: true });
      await run(
        Animated.parallel([
          Animated.timing(monsterLunge, {
            toValue: 0,
            duration: 260,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.sequence([
            jolt(petShake, 1),
            jolt(petShake, -1),
            jolt(petShake, 0.5),
            jolt(petShake, 0),
          ]),
          Animated.sequence([jolt(quake, 1), jolt(quake, -1), jolt(quake, 0.5), jolt(quake, 0)]),
          Animated.sequence([
            Animated.timing(redFlash, { toValue: 0.45, duration: 60, useNativeDriver: true }),
            Animated.timing(redFlash, { toValue: 0, duration: 240, useNativeDriver: true }),
          ]),
        ])
      );
    },

    /** The monster pops; resolves when it is gone. */
    async defeatMonster() {
      successFeedback();
      burst.setValue(0);
      await run(
        Animated.parallel([
          Animated.timing(monsterGone, {
            toValue: 1,
            duration: 520,
            easing: Easing.in(Easing.back(1.4)),
            useNativeDriver: true,
          }),
          Animated.timing(burst, {
            toValue: 1,
            duration: 520,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      );
    },
  }));

  const ready = size.width > 0;
  const lungeDistance = Math.max(size.width - EDGE * 2 - PET_WIDTH - monsterWidth + 18, 0);
  const poop = path.track(0);
  const floatUp = (value) => value.interpolate({ inputRange: [0, 1], outputRange: [0, -46] });
  const fadeOut = (value) =>
    value.interpolate({ inputRange: [0, 0.05, 0.7, 1], outputRange: [0, 1, 1, 0] });

  return (
    <View
      style={[styles.arena, { backgroundColor: biome.sky }, style]}
      onLayout={(e) => setSize(e.nativeEvent.layout)}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { transform: [{ translateX: quake.interpolate({ inputRange: [-1, 1], outputRange: [-6, 6] }) }] },
        ]}
      >
        {/* Sky */}
        <View style={[styles.skyLow, { backgroundColor: biome.skyLow }]} />
        <View style={[styles.orb, { backgroundColor: biome.orb }]} />
        {biome.night
          ? STARS.map(([x, y], i) => (
              <View
                key={i}
                style={[
                  styles.star,
                  { left: `${x * 100}%`, top: `${y * 100}%`, backgroundColor: biome.dots },
                  i % 3 === 0 && styles.starBig,
                ]}
              />
            ))
          : null}
        {!biome.night ? (
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { transform: [{ translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [0, -28] }) }] },
            ]}
          >
            {SKY_DOTS.map(([x, y, w], i) => (
              <View key={i} style={{ position: 'absolute', left: `${x * 100}%`, top: `${y * 100}%` }}>
                <View style={[styles.cloud, { width: w, backgroundColor: biome.dots }]} />
                <View
                  style={[styles.cloud, { width: w + 12, marginLeft: -6, backgroundColor: biome.dots }]}
                />
              </View>
            ))}
          </Animated.View>
        ) : null}

        {/* Ground */}
        <View style={[styles.ground, { backgroundColor: biome.ground }]}>
          <View style={[styles.dirt, { backgroundColor: biome.dirt }]} />
          {[0.07, 0.22, 0.41, 0.63, 0.8, 0.93].map((x, i) => (
            <View
              key={i}
              style={[styles.tuft, { left: `${x * 100}%`, backgroundColor: biome.dirt }]}
            />
          ))}
        </View>

        {ready ? (
          <>
            {/* Buddy */}
            <Animated.View
              style={[
                styles.pet,
                {
                  transform: [
                    {
                      translateX: Animated.add(
                        petToss.interpolate({ inputRange: [0, 1], outputRange: [0, 12] }),
                        petShake.interpolate({ inputRange: [-1, 1], outputRange: [-7, 7] })
                      ),
                    },
                  ],
                },
              ]}
            >
              <PetSprite mood={petMood} species={species} outfit={outfit} pixelSize={PET_PIXEL} />
            </Animated.View>

            {/* Monster */}
            <Animated.View
              style={[
                styles.monster,
                {
                  bottom: monsterBottom,
                  opacity: Animated.multiply(
                    monsterBlink,
                    monsterGone.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] })
                  ),
                  transform: [
                    {
                      translateX: Animated.add(
                        monsterLunge.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -lungeDistance],
                        }),
                        monsterShake.interpolate({ inputRange: [-1, 1], outputRange: [-8, 8] })
                      ),
                    },
                    {
                      translateY: monsterBob.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, flies ? -9 : -4],
                      }),
                    },
                    { scale: monsterGone.interpolate({ inputRange: [0, 1], outputRange: [1, 0.1] }) },
                    {
                      rotate: monsterGone.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '200deg'],
                      }),
                    },
                  ],
                },
              ]}
            >
              <PixelSprite grid={sprite.grid} palette={sprite.palette} pixelSize={monsterPixel} />
            </Animated.View>

            {/* Trail, then the poop on top of it */}
            {TRAIL.map((lag, i) => {
              const spot = path.track(lag);
              const spark = 9 - i;
              return (
                <Animated.View
                  key={lag}
                  style={[
                    styles.flying,
                    {
                      width: spark,
                      height: spark,
                      marginLeft: (POOP_SIZE - spark) / 2,
                      marginTop: (POOP_SIZE - spark) / 2,
                      backgroundColor: colors.trail[i % colors.trail.length],
                      opacity: flight.interpolate({
                        inputRange: [0, lag, lag + 0.02, 0.97, 1],
                        outputRange: [0, 0, 1 - i * 0.14, 1 - i * 0.14, 0],
                      }),
                      transform: [{ translateX: spot.translateX }, { translateY: spot.translateY }],
                    },
                  ]}
                />
              );
            })}
            <Animated.View
              style={[
                styles.flying,
                {
                  opacity: flight.interpolate({
                    inputRange: [0, 0.01, 0.99, 1],
                    outputRange: [0, 1, 1, 0],
                  }),
                  transform: [
                    { translateX: poop.translateX },
                    { translateY: poop.translateY },
                    {
                      rotate: flight.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '540deg'],
                      }),
                    },
                  ],
                },
              ]}
            >
              <PoopSprite pixelSize={POOP_PIXEL} />
            </Animated.View>

            {/* Splash */}
            {bursts.map((b, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.flying,
                  {
                    left: path.end.x + POOP_SIZE / 2 - b.size / 2,
                    top: path.end.y + POOP_SIZE / 2 - b.size / 2,
                    width: b.size,
                    height: b.size,
                    backgroundColor: colors.burst[b.color % colors.burst.length],
                    opacity: burst.interpolate({
                      inputRange: [0, 0.05, 0.6, 1],
                      outputRange: [0, 1, 1, 0],
                    }),
                    transform: [
                      { translateX: burst.interpolate({ inputRange: [0, 1], outputRange: [0, b.dx] }) },
                      { translateY: burst.interpolate({ inputRange: [0, 1], outputRange: [0, b.dy] }) },
                    ],
                  },
                ]}
              />
            ))}

            {/* Numbers */}
            {hit ? (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.hitWrap,
                  {
                    width: monsterWidth + 60,
                    right: EDGE - 30,
                    bottom: monsterBottom + monsterHeight - 6,
                    opacity: fadeOut(hitFloat),
                    transform: [{ translateY: floatUp(hitFloat) }],
                  },
                ]}
              >
                {hit.crit ? <Text style={styles.critText}>CRIT!</Text> : null}
                <Text style={[styles.hitText, hit.crit && styles.hitTextCrit]}>-{hit.damage}</Text>
              </Animated.View>
            ) : null}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.ouchWrap,
                { opacity: fadeOut(ouchFloat), transform: [{ translateY: floatUp(ouchFloat) }] },
              ]}
            >
              <Text style={styles.ouchText}>-{ouch}</Text>
            </Animated.View>
          </>
        ) : null}
      </Animated.View>

      {/* Hand banner */}
      {hit ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.banner,
            {
              opacity: banner,
              transform: [{ scale: banner.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
            },
          ]}
        >
          <Text style={styles.bannerText}>
            {hit.combo.name.toUpperCase()} x{hit.combo.multiplier}
          </Text>
        </Animated.View>
      ) : null}

      <Animated.View pointerEvents="none" style={[styles.redFlash, { opacity: redFlash }]} />
    </View>
  );
});

export default Arena;

const styles = StyleSheet.create({
  arena: {
    borderWidth: 3,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  skyLow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: GROUND,
    height: '30%',
    opacity: 0.8,
  },
  orb: {
    position: 'absolute',
    top: 14,
    right: 26,
    width: 22,
    height: 22,
    borderRadius: RADIUS.sm,
  },
  star: {
    position: 'absolute',
    width: 3,
    height: 3,
  },
  starBig: {
    width: 5,
    height: 5,
  },
  cloud: {
    height: 6,
    opacity: 0.9,
  },
  ground: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: GROUND,
    borderTopWidth: 3,
    borderTopColor: COLORS.outline,
  },
  dirt: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 16,
  },
  tuft: {
    position: 'absolute',
    top: 7,
    width: 10,
    height: 4,
  },
  pet: {
    position: 'absolute',
    left: EDGE,
    bottom: GROUND - 14,
  },
  monster: {
    position: 'absolute',
    right: EDGE,
  },
  flying: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  hitWrap: {
    position: 'absolute',
    alignItems: 'center',
  },
  hitText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    textShadowColor: COLORS.outline,
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 0,
  },
  hitTextCrit: {
    fontSize: 34,
    color: COLORS.sun,
  },
  critText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.5,
    color: COLORS.sun,
    textShadowColor: COLORS.outline,
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
  },
  ouchWrap: {
    position: 'absolute',
    left: EDGE,
    width: PET_WIDTH,
    bottom: GROUND + 70,
    alignItems: 'center',
  },
  ouchText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FF6B5E',
    textShadowColor: COLORS.outline,
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 0,
  },
  banner: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    backgroundColor: COLORS.outline,
    borderWidth: 2,
    borderColor: COLORS.sun,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  bannerText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.2,
    color: COLORS.sun,
  },
  redFlash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#D9322B',
  },
});
