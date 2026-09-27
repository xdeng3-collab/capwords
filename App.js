import React, { useEffect } from 'react';
import { AppState, StatusBar } from 'react-native';
import * as Linking from 'expo-linking';
import AppNavigator from './src/navigation/AppNavigator';
import { AlertProvider } from './src/components/PixelAlert';
import { refreshWidget } from './src/services/widgetService';
import { syncEntitlements, watchEntitlements } from './src/services/purchaseService';
import { startSessionAutoRefresh } from './src/services/supabase';
import { completeAuthFromUrl, pushProgress } from './src/services/accountService';

export default function App() {
  // Keep the home screen widget in step with the app: once on launch, and
  // again whenever we come back to the foreground (the buddy's mood and the
  // streak can both roll over while the app is closed).
  useEffect(() => {
    refreshWidget();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refreshWidget();
        // Same moment is the right one to re-publish the numbers pals see:
        // the streak may have rolled over while the app was closed. A no-op
        // when signed out, and never awaited.
        pushProgress();
      }
    });
    return () => sub.remove();
  }, []);

  // Links from Supabase's emails — the sign-up confirmation and the password
  // reset — come back into the app as capwords:// URLs carrying a session.
  // They have to be caught here rather than in a screen, because a cold start
  // from Mail has no screen mounted yet. Anything that is not an auth link
  // (the widget's capwords://camera) falls through to the navigator.
  useEffect(() => {
    Linking.getInitialURL().then((url) => url && completeAuthFromUrl(url));
    const sub = Linking.addEventListener('url', ({ url }) => completeAuthFromUrl(url));
    return () => sub.remove();
  }, []);

  // Supabase refreshes its access token on a timer. Left running in the
  // background it wakes up to a burst of failed requests every time iOS
  // suspends the app, so it is tied to foreground state instead.
  useEffect(() => startSessionAutoRefresh(), []);

  // A subscription lives on the Apple ID, not on our servers, so a fresh
  // install has to ask the App Store what this person already owns. Silent on
  // purpose: no password prompt, unlike the explicit Restore button.
  useEffect(() => {
    syncEntitlements().catch(() => {});
    // Renewals, refunds, and purchases made on another device land here.
    return watchEntitlements(() => {});
  }, []);

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <AlertProvider>
        <AppNavigator />
      </AlertProvider>
    </>
  );
}
