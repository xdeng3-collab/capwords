import { STORAGE_KEYS, readJSON, writeJSON } from './storage';

// App preferences, set on Me -> App settings. Older installs may still carry
// unused keys from before the screen existed; they are harmless.
const DEFAULT_SETTINGS = {
  // 'system' follows iOS Settings -> Accessibility -> Motion -> Reduce Motion;
  // 'on' / 'off' override it for this app.
  reduceMotion: 'system',
  hapticFeedback: true,
  // Photos go to a third-party AI to be recognised; Apple requires asking
  // before the first one is sent.
  aiPhotoConsent: false,
};

export async function getSettings() {
  const stored = await readJSON(STORAGE_KEYS.SETTINGS, {});
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function updateSettings(updates) {
  const settings = await getSettings();
  return writeJSON(STORAGE_KEYS.SETTINGS, { ...settings, ...updates });
}
