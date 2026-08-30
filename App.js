import React, { useEffect } from 'react';
import { AppState, StatusBar } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { AlertProvider } from './src/components/PixelAlert';
import { refreshWidget } from './src/services/widgetService';

export default function App() {
  // Keep the home screen widget in step with the app: once on launch, and
  // again whenever we come back to the foreground (the buddy's mood and the
  // streak can both roll over while the app is closed).
  useEffect(() => {
    refreshWidget();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshWidget();
    });
    return () => sub.remove();
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
