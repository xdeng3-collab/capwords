import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS } from '../../../theme';
import { PixelButton, PixelIcon, PixelPanel, PixelSprite } from '../../../components';

/**
 * The once-a-day gift, as a popup: a treasure chest the buddy fished out of
 * the sea. Tapping Collect opens it, coins spring out, and it closes itself.
 */

const CHEST_PALETTE = {
  B: COLORS.outline,
  b: '#B8763A',
  y: COLORS.sun,
  k: '#8C5A22',
  c: '#FFE07A',
  C: '#E0A02E',
};

const CHEST_CLOSED = [
  '.BBBBBBBBBBBB.',
  'BbbbbbbbbbbbbB',
  'BbbbbbbbbbbbbB',
  'BbbbbbbbbbbbbB',
  'yyyyyykkyyyyyy',
  'BbbbbbkkbbbbbB',
  'BbbbbbbbbbbbbB',
  'BbbbbbbbbbbbbB',
  'BBBBBBBBBBBBBB',
];

const CHEST_OPEN = [
  '.BBBBBBBBBBBB.',
  'BbbbbbbbbbbbbB',
  'yyyyyyyyyyyyyy',
  'B.cCc.cCc.cc.B',
  'BcccccccccccCB',
  'yyyyyykkyyyyyy',
  'BbbbbbkkbbbbbB',
  'BbbbbbbbbbbbbB',
  'BBBBBBBBBBBBBB',
];

const COIN_FLIGHTS = [-70, -42, -14, 14, 42, 70];

export default function DailyGiftModal({ visible, amount, buddyName, onCollect, onClose }) {
  const [opened, setOpened] = useState(false);
  const pop = useRef(new Animated.Value(0)).current;
  const wiggle = useRef(new Animated.Value(0)).current;
  const fly = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return undefined;
    setOpened(false);
    fly.setValue(0);
    pop.setValue(0);
    Animated.spring(pop, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(wiggle, { toValue: 1, duration: 90, useNativeDriver: true }),
        Animated.timing(wiggle, { toValue: -1, duration: 180, useNativeDriver: true }),
        Animated.timing(wiggle, { toValue: 0, duration: 90, useNativeDriver: true }),
        Animated.delay(900),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [visible, pop, wiggle, fly]);

  const collect = async () => {
    if (opened) return;
    setOpened(true);
    wiggle.stopAnimation();
    wiggle.setValue(0);
    await onCollect?.();
    Animated.timing(fly, {
      toValue: 1,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => setTimeout(onClose, 250));
  };

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
            <Text style={styles.kicker}>DAILY GIFT</Text>
            <View style={styles.chestStage}>
              {COIN_FLIGHTS.map((dx, k) => (
                <Animated.View
                  key={k}
                  style={[
                    styles.flyingCoin,
                    {
                      opacity: fly.interpolate({ inputRange: [0, 0.1, 0.75, 1], outputRange: [0, 1, 1, 0] }),
                      transform: [
                        { translateX: fly.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }) },
                        {
                          translateY: fly.interpolate({
                            inputRange: [0, 0.5, 1],
                            outputRange: [0, -70 - (k % 2) * 18, -40],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <PixelIcon name="coin" size={18} color={COLORS.sun} light={COLORS.surface} />
                </Animated.View>
              ))}
              <Animated.View
                style={{
                  transform: [
                    { rotate: wiggle.interpolate({ inputRange: [-1, 1], outputRange: ['-6deg', '6deg'] }) },
                  ],
                }}
              >
                <PixelSprite
                  grid={opened ? CHEST_OPEN : CHEST_CLOSED}
                  palette={CHEST_PALETTE}
                  pixelSize={7}
                />
              </Animated.View>
            </View>
            <Text style={styles.title}>
              {opened ? `+${amount} coins!` : `${buddyName} fished up a treasure chest!`}
            </Text>
            <Text style={styles.subtitle}>
              {opened ? 'Spend them on outfits in the Wardrobe.' : 'Come back every day for another one.'}
            </Text>
            <PixelButton
              label={opened ? 'Nice!' : `Collect +${amount}`}
              icon={opened ? 'check' : 'coin'}
              color={COLORS.leaf}
              size="lg"
              style={styles.button}
              onPress={opened ? onClose : collect}
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
  chestStage: {
    height: 130,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 6,
    marginVertical: 6,
  },
  flyingCoin: { position: 'absolute', bottom: 40 },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 6,
  },
  button: { alignSelf: 'stretch', marginTop: 18 },
});
