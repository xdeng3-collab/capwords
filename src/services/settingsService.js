import { getSettings, updateSettings } from '../data/settingsStore';
import { setHapticsEnabled } from '../utils/haptics';

/**
 * App preferences (Me -> App settings). Kept in memory once loaded so that
 * animation code can ask "reduce motion?" synchronously, with listeners so a
 * change on the settings screen reaches screens that are already open.
 */

let current = null;
const listeners = new Set();

function publish(next) {
  current = next;
  setHapticsEnabled(next.hapticFeedback);
  listeners.forEach((fn) => fn(next));
  return next;
}

/** Read from storage once at launch (and whenever a fresh copy is wanted). */
export async function loadAppSettings() {
  return publish(await getSettings());
}

/** The last loaded settings, or null before the first load. */
export function peekAppSettings() {
  return current;
}

export async function setAppSetting(key, value) {
  return publish(await updateSettings({ [key]: value }));
}

/** Called with the new settings whenever one changes. Returns unsubscribe. */
export function subscribeAppSettings(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
