import * as Haptics from 'expo-haptics';

/**
 * Named haptic cues. Feedback is decoration: a device without a Taptic
 * Engine (or a simulator) rejects these calls, and that must never surface as
 * an error, so every helper swallows its own failure.
 */
const quietly = (promise) => promise.catch(() => {});

/** A button press or a small toggle. */
export const tapFeedback = () => quietly(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));

/** A heavier action: the shutter, starting a recording. */
export const pressFeedback = () =>
  quietly(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));

/** Picking one option from a set, or stepping a value. */
export const selectFeedback = () => quietly(Haptics.selectionAsync());

export const successFeedback = () =>
  quietly(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));

export const warningFeedback = () =>
  quietly(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));

export const errorFeedback = () =>
  quietly(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
