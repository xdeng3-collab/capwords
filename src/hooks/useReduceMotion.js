import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { peekAppSettings, subscribeAppSettings } from '../services/settingsService';

/**
 * Whether to tone animation down: iOS's Reduce Motion setting, unless the
 * app's own App settings override it ('on' / 'off'). Updates live when
 * either changes.
 */
export function useReduceMotion() {
  const [system, setSystem] = useState(false);
  const [pref, setPref] = useState(peekAppSettings()?.reduceMotion || 'system');

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((on) => alive && setSystem(on))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setSystem);
    const unsubscribe = subscribeAppSettings((s) => setPref(s.reduceMotion));
    return () => {
      alive = false;
      sub?.remove?.();
      unsubscribe();
    };
  }, []);

  return pref === 'on' || (pref === 'system' && system);
}
