import * as Speech from 'expo-speech';
import { setAudioModeAsync } from 'expo-audio';

/**
 * Sound the learner asked for (a word, their own recording) should play out
 * of the loudspeaker even with the silent switch on. Without this, iOS mutes
 * it in silent mode, and right after recording it can still be routed to the
 * quiet earpiece.
 */
export function playbackMode() {
  return setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
}

/** Say a word aloud, slowly. `callbacks` are expo-speech's onDone etc. */
export async function speakWord(word, language, callbacks = {}) {
  await playbackMode();
  Speech.stop();
  Speech.speak(word, { language, rate: 0.8, ...callbacks });
}
