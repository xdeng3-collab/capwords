import React, { useEffect, useRef } from 'react';
import { Animated, Modal, StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS } from '../../../theme';
import { PetSprite, PixelButton, PixelIcon, PixelPanel, petSpriteHeight } from '../../../components';
import Halo from './Halo';

/**
 * Shown once the buddy has landed on a milestone island: the buddy in its new
 * halo, and what the milestone paid.
 */

const PET_PX = 6;
const PET_W = 18 * PET_PX;

export default function MilestoneModal({ visible, island, haloDays, coins, pet, buddyName, onClose, reduceMotion }) {
  const pop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    if (reduceMotion) {
      pop.setValue(1);
      return;
    }
    pop.setValue(0);
    Animated.spring(pop, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }).start();
  }, [visible, pop, reduceMotion]);

  const petH = petSpriteHeight(pet.species, PET_PX);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Animated.View
          style={{
            width: '100%',
            opacity: pop,
            transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }],
          }}
        >
          <PixelPanel style={styles.card}>
            <Text style={styles.kicker}>MILESTONE · ISLAND {island}</Text>
            <View style={[styles.stage, { height: petH + 40 }]}>
              <View style={{ width: PET_W, height: petH }}>
                <Halo width={PET_W} height={petH} pixelSize={PET_PX} still={reduceMotion} />
                <PetSprite
                  mood="happy"
                  species={pet.species}
                  outfit={pet.outfit}
                  pixelSize={PET_PX}
                  animate={!reduceMotion}
                />
              </View>
            </View>
            <Text style={styles.title}>{buddyName} earned a halo!</Text>
            <Text style={styles.subtitle}>
              It glows for {haloDays} days. Keep hopping - the next halo waits further on.
            </Text>
            {coins > 0 ? (
              <View style={styles.reward}>
                <PixelIcon name="coin" size={18} color={COLORS.sun} light={COLORS.surface} />
                <Text style={styles.rewardText}>+{coins} coins</Text>
              </View>
            ) : null}
            <PixelButton
              label="Wonderful!"
              icon="star"
              color={COLORS.warning}
              size="lg"
              style={styles.button}
              onPress={onClose}
            />
          </PixelPanel>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(30,42,60,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  card: { alignItems: 'center', paddingVertical: 22 },
  kicker: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.primaryDark,
    letterSpacing: 2,
    backgroundColor: `${COLORS.sun}55`,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
  },
  stage: { alignItems: 'center', justifyContent: 'flex-end', marginVertical: 6 },
  title: { fontSize: 18, fontWeight: '900', color: COLORS.text, textAlign: 'center' },
  subtitle: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 6,
  },
  reward: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  rewardText: { fontSize: 16, fontWeight: '900', color: '#B8860B' },
  button: { alignSelf: 'stretch', marginTop: 18 },
});
