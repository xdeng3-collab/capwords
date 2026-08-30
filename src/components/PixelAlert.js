import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, RADIUS, SHADOW } from '../config';
import { PixelButton } from './UI';

const AlertContext = createContext(() => {});

/**
 * Drop-in replacement for React Native's Alert.alert that renders in the app's
 * pixel style instead of the system dialog. Call signature matches Alert.alert:
 *
 *   const showAlert = useAlert();
 *   showAlert('Title', 'Message', [{ text: 'Cancel', style: 'cancel' }, { text: 'OK', onPress }]);
 *
 * Buttons render filled, with any `style: 'cancel'` button as the quiet text
 * action underneath. Tapping the backdrop or the X runs the cancel button.
 */
export function useAlert() {
  return useContext(AlertContext);
}

export function AlertProvider({ children }) {
  const [alertState, setAlertState] = useState(null);
  const pop = useRef(new Animated.Value(0)).current;

  const showAlert = useCallback(
    (title, message, buttons) => {
      const list = buttons?.length ? buttons : [{ text: 'OK' }];
      pop.setValue(0);
      setAlertState({ title, message, buttons: list });
      Animated.spring(pop, {
        toValue: 1,
        friction: 6,
        tension: 90,
        useNativeDriver: true,
      }).start();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    },
    [pop]
  );

  const dismiss = useCallback((button) => {
    setAlertState(null);
    button?.onPress?.();
  }, []);

  // Backdrop / hardware back behaves like the cancel button when there is one.
  const handleBackdrop = useCallback(() => {
    const cancel = alertState?.buttons.find((b) => b.style === 'cancel');
    dismiss(cancel);
  }, [alertState, dismiss]);

  const value = useMemo(() => showAlert, [showAlert]);
  const filled = alertState?.buttons.filter((b) => b.style !== 'cancel') ?? [];
  const cancel = alertState?.buttons.find((b) => b.style === 'cancel');
  const translateY = pop.interpolate({ inputRange: [0, 1], outputRange: [30, 0] });

  return (
    <AlertContext.Provider value={value}>
      {children}
      <Modal
        visible={!!alertState}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={handleBackdrop}
      >
        <Pressable style={styles.backdrop} onPress={handleBackdrop}>
          {/* Swallow taps on the card so only the backdrop dismisses. */}
          <Pressable onPress={() => {}}>
            <Animated.View
              style={[styles.card, { opacity: pop, transform: [{ scale: pop }, { translateY }] }]}
            >
              {alertState?.title ? (
                <Text style={styles.title}>{alertState.title.toUpperCase()}</Text>
              ) : null}
              {alertState?.message ? (
                <Text style={styles.message}>{alertState.message}</Text>
              ) : null}

              <View style={styles.buttons}>
                {filled.map((button, index) => (
                  <PixelButton
                    key={button.text ?? index}
                    label={button.text}
                    color={button.style === 'destructive' ? COLORS.danger : COLORS.primary}
                    onPress={() => dismiss(button)}
                    size="lg"
                    style={styles.button}
                  />
                ))}
                {cancel ? (
                  <TouchableOpacity style={styles.cancelButton} onPress={() => dismiss(cancel)}>
                    <Text style={styles.cancelText}>{cancel.text.toUpperCase()}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </Animated.View>
          </Pressable>
        </Pressable>
      </Modal>
    </AlertContext.Provider>
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
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 4,
    borderColor: COLORS.outline,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 18,
    ...SHADOW.glow,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 10,
  },
  buttons: { marginTop: 20, gap: 10 },
  button: { alignSelf: 'stretch' },
  cancelButton: { marginTop: 2, paddingVertical: 8, alignItems: 'center' },
  cancelText: {
    color: COLORS.textLight,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
