import { STORAGE_KEYS, readJSON, writeJSON } from './storage';

// App preferences. Nothing reads these yet; they are here so the settings
// screen (Profile -> "App settings", currently "coming soon") has a home.
const DEFAULT_SETTINGS = {
  notifications: true,
  soundEffects: true,
  hapticFeedback: true,
  autoSpeak: true,
};

export function getSettings() {
  return readJSON(STORAGE_KEYS.SETTINGS, { ...DEFAULT_SETTINGS });
}

export async function updateSettings(updates) {
  const settings = await getSettings();
  return writeJSON(STORAGE_KEYS.SETTINGS, { ...settings, ...updates });
}
