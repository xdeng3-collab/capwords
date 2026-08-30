import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS, PRICING, RADIUS, SHADOW } from '../config';
import PixelIcon from './PixelIcon';
import PetSprite from './PetSprite';
import { PixelButton } from './UI';

/**
 * Shown when the free daily words are used up. Offers a jump to the plans
 * screen; dismissible via the X, "Maybe later", the backdrop, or hardware back.
 */
export default function PaywallModal({ visible, petName = 'Your buddy', pet, onClose, onSeePlans }) {
  const pop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      pop.setValue(0);
      Animated.spring(pop, {
        toValue: 1,
        friction: 6,
        tension: 90,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, pop]);

  const translateY = pop.interpolate({ inputRange: [0, 1], outputRange: [40, 0] });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Swallow taps on the card so only the backdrop dismisses. */}
        <Pressable onPress={() => {}}>
          <Animated.View
            style={[styles.card, { opacity: pop, transform: [{ scale: pop }, { translateY }] }]}
          >
            <TouchableOpacity style={styles.closeButton} onPress={onClose} hitSlop={10}>
              <PixelIcon name="close" size={16} color={COLORS.text} />
            </TouchableOpacity>

            <PetSprite
              mood="sleepy"
              species={pet?.species}
              outfit={pet?.equippedOutfit}
              pixelSize={6}
            />

            <Text style={styles.title}>OUT OF WORDS FOR TODAY</Text>
            <Text style={styles.body}>
              {petName} has had all {PRICING.freeWordsPerDay} free words for today. Upgrade for
              unlimited learning, or come back tomorrow.
            </Text>

            <PixelButton
              label="See plans"
              icon="star"
              color={COLORS.leaf}
              onPress={onSeePlans}
              size="lg"
              style={styles.primaryButton}
            />

            <TouchableOpacity style={styles.laterButton} onPress={onClose}>
              <Text style={styles.laterText}>MAYBE LATER</Text>
            </TouchableOpacity>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(43, 32, 20, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 4,
    borderColor: COLORS.outline,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 18,
    ...SHADOW.glow,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    borderColor: COLORS.outline,
    padding: 6,
    zIndex: 10,
  },
  title: {
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 0.8,
    textAlign: 'center',
    marginTop: 10,
  },
  body: {
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 18,
  },
  primaryButton: { alignSelf: 'stretch' },
  laterButton: { marginTop: 12, paddingVertical: 8, paddingHorizontal: 16 },
  laterText: {
    color: COLORS.textLight,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
