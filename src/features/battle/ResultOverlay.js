import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS } from '../../theme';
import { PetSprite, PixelButton, PixelIcon, PixelPanel } from '../../components';
import { outfitBonusLabels } from '../../utils/outfits';

const CONFETTI = [COLORS.sun, COLORS.secondary, COLORS.leaf, COLORS.sky, COLORS.berry, COLORS.streak];

const LOSS_LINES = {
  ammo: (monster) => `Out of poops! The ${monster} is still standing.`,
  health: (monster, pet) => `The ${monster} knocked ${pet} out.`,
  fled: (monster) => `You ran from the ${monster}.`,
};

/**
 * What a fight ended in, laid over the arena: coins and maybe a new outfit
 * for a win, a coin retry for a loss.
 */
export default function ResultOverlay({
  result,
  level,
  pet,
  coins,
  nextLevel,
  freeRetry,
  onRetry,
  onWear,
  onLobby,
}) {
  const pop = useRef(new Animated.Value(0)).current;
  const fall = useRef(new Animated.Value(0)).current;

  const pieces = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        left: `${5 + ((i * 37) % 90)}%`,
        size: 7 + (i % 4) * 2,
        color: CONFETTI[i % CONFETTI.length],
        start: 0.02 + (i % 5) * 0.08,
        drift: ((i % 7) - 3) * 14,
      })),
    []
  );

  useEffect(() => {
    Animated.spring(pop, { toValue: 1, friction: 6, tension: 100, useNativeDriver: true }).start();
    if (!result.won) return undefined;
    const rain = Animated.loop(
      Animated.timing(fall, {
        toValue: 1,
        duration: 2600,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    rain.start();
    return () => rain.stop();
  }, [pop, fall, result.won]);

  const canRetry = coins >= level.retryCoins;
  const reward = result.reward;

  return (
    <View style={styles.backdrop}>
      {result.won
        ? pieces.map((piece, i) => (
            <Animated.View
              key={i}
              style={{
                position: 'absolute',
                top: -20,
                left: piece.left,
                width: piece.size,
                height: piece.size,
                backgroundColor: piece.color,
                transform: [
                  {
                    translateY: fall.interpolate({
                      inputRange: [0, piece.start, 1],
                      outputRange: [0, 0, 900],
                    }),
                  },
                  { translateX: fall.interpolate({ inputRange: [0, 1], outputRange: [0, piece.drift] }) },
                  { rotate: fall.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '720deg'] }) },
                ],
              }}
            />
          ))
        : null}

      <Animated.View
        style={{
          alignSelf: 'stretch',
          opacity: pop,
          transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
        }}
      >
        <PixelPanel style={styles.card}>
          {result.won ? (
            <>
              <PixelIcon name="trophy" size={30} color={COLORS.primary} light={COLORS.sun} />
              <Text style={styles.title}>VICTORY!</Text>
              <Text style={styles.line}>
                Level {level.level} cleared. The {level.monster.name} never saw it coming.
              </Text>
              <View style={styles.coinRow}>
                <PixelIcon name="coin" size={18} color={COLORS.sun} light={COLORS.surface} />
                <Text style={styles.coinText}>+{result.coinsEarned} COINS</Text>
              </View>

              {reward ? (
                <View style={styles.reward}>
                  <Text style={styles.rewardKicker}>LIMITED OUTFIT UNLOCKED</Text>
                  <View style={styles.rewardPet}>
                    <PetSprite mood="happy" species={pet.species} outfit={reward.id} pixelSize={7} />
                  </View>
                  <Text style={styles.rewardName}>{reward.name.toUpperCase()}</Text>
                  <Text style={styles.rewardBonus}>{outfitBonusLabels(reward).join('  ·  ')}</Text>
                  <PixelButton
                    label="Wear it now"
                    icon="shirt"
                    color={COLORS.berry}
                    style={styles.button}
                    onPress={() => onWear(reward.id)}
                  />
                </View>
              ) : null}

              <PixelButton
                label={`Next: level ${nextLevel.level}`}
                icon="sword"
                color={COLORS.leaf}
                style={styles.button}
                onPress={onLobby}
              />
            </>
          ) : (
            <>
              <View style={styles.sadPet}>
                <PetSprite mood="sad" species={pet.species} outfit={pet.outfit} pixelSize={6} />
              </View>
              <Text style={styles.title}>DEFEATED</Text>
              <Text style={styles.line}>
                {(LOSS_LINES[result.reason] || LOSS_LINES.ammo)(level.monster.name, pet.name)}
              </Text>
              {freeRetry ? (
                <PixelButton
                  label="Fight again"
                  icon="sword"
                  color={COLORS.secondary}
                  style={styles.button}
                  onPress={onRetry}
                />
              ) : (
                <>
                  <Text style={styles.hint}>
                    A coin retry puts you straight back in, without spending any poops.
                  </Text>
                  <PixelButton
                    label={`Retry for ${level.retryCoins} coins`}
                    icon="coin"
                    color={COLORS.primary}
                    style={styles.button}
                    disabled={!canRetry}
                    onPress={onRetry}
                  />
                  {!canRetry ? (
                    <Text style={styles.short}>
                      You have {coins} coins. Learn words to earn more.
                    </Text>
                  ) : null}
                </>
              )}
              <PixelButton
                label="Back to camp"
                color={COLORS.textLight}
                style={styles.button}
                onPress={onLobby}
              />
            </>
          )}
        </PixelPanel>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(58,42,26,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 26,
    paddingBottom: 110,
    overflow: 'hidden',
  },
  card: {
    alignItems: 'center',
    paddingVertical: 22,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 2,
    marginTop: 8,
  },
  line: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 6,
    paddingHorizontal: 6,
  },
  hint: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 8,
    paddingHorizontal: 6,
  },
  short: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.danger,
    marginTop: 6,
  },
  coinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  coinText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#B8860B',
    letterSpacing: 1,
  },
  reward: {
    alignSelf: 'stretch',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    paddingBottom: 4,
    paddingHorizontal: 10,
    backgroundColor: '#FFF3C9',
    borderWidth: 2,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.md,
  },
  rewardKicker: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.primaryDark,
    letterSpacing: 1,
  },
  rewardPet: {
    marginTop: 10,
  },
  rewardName: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 1,
    marginTop: 8,
  },
  rewardBonus: {
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.textLight,
    letterSpacing: 0.5,
    marginTop: 3,
  },
  sadPet: {
    marginTop: 6,
  },
  button: {
    alignSelf: 'stretch',
    marginTop: 12,
  },
});
