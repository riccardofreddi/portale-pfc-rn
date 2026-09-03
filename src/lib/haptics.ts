/**
 * Haptics feedback wrapper.
 * Usa ReactNativeHapticFeedback se disponibile, fallback no-op.
 */

import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const OPTIONS = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

export type HapticPattern =
  | 'selection'
  | 'impactLight'
  | 'impactMedium'
  | 'impactHeavy'
  | 'notificationSuccess'
  | 'notificationWarning'
  | 'notificationError';

export function haptic(pattern: HapticPattern = 'selection'): void {
  try {
    ReactNativeHapticFeedback.trigger(pattern, OPTIONS);
  } catch {
    // silent: haptics non disponibile (es. emulatore)
  }
}

// Helpers semantici
export const haptics = {
  tap: () => haptic('selection'),
  success: () => haptic('notificationSuccess'),
  warning: () => haptic('notificationWarning'),
  error: () => haptic('notificationError'),
  impact: () => haptic('impactLight'),
};