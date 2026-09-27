import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { PET } from '../../config';
import { LoadingScreen, OnboardingScreen } from '../../features/onboarding';
import { SessionContext } from '../../hooks/useSession';
import { getMyProfile, onAuthChange, pushProgress } from '../../services/accountService';
import { removeDemoData } from '../../services/deviceDataService';
import { getPet } from '../../services/petService';
import { hasCompletedOnboarding } from '../../services/profileService';
import TabNavigator from './TabNavigator';
import { linking } from './linking';

/**
 * Decides what the whole app shows: the loading splash while storage is read,
 * onboarding on a first run, then the tabs. It also owns the one auth
 * subscription and hands the result down through SessionContext.
 */
export default function RootNavigator() {
  // null while we are still reading storage — the loading screen covers it.
  const [onboarded, setOnboarded] = useState(null);
  const [petName, setPetName] = useState(PET.defaultName);
  const [settled, setSettled] = useState(false);
  // The Supabase user, and the profile row that goes with them. Both null
  // when signed out, which is a perfectly normal way to use the app.
  const [user, setUser] = useState(null);
  const [account, setAccount] = useState(null);

  useEffect(() => {
    (async () => {
      // One-time sweep of the sample data an older build could seed.
      await removeDemoData().catch(() => {});
      const [done, pet] = await Promise.all([hasCompletedOnboarding(), getPet()]);
      setPetName(pet.name);
      setOnboarded(done);
    })();
  }, []);

  // One auth subscription for the whole app. Screens read the result off the
  // session context instead of each opening their own listener.
  useEffect(
    () =>
      onAuthChange((s) => {
        const nextUser = s?.user || null;
        setUser(nextUser);
        if (!nextUser) {
          setAccount(null);
          return;
        }
        getMyProfile().then(setAccount);
        // A returning session may have been away for days; make sure the
        // numbers pals can see are the ones on this phone.
        pushProgress();
      }),
    []
  );

  const refreshAccount = useCallback(async () => {
    const profile = await getMyProfile();
    setAccount(profile);
    return profile;
  }, []);

  const handleSettled = useCallback(() => setSettled(true), []);

  const session = useMemo(
    () => ({
      // Storage is already cleared by the time this runs — just show onboarding.
      signedOut: () => {
        setPetName(PET.defaultName);
        setOnboarded(false);
      },
      user,
      account,
      refreshAccount,
    }),
    [user, account, refreshAccount]
  );

  if (!settled || onboarded === null) {
    return (
      <LoadingScreen
        petName={petName}
        ready={onboarded !== null}
        onSettled={handleSettled}
      />
    );
  }

  if (!onboarded) {
    return <OnboardingScreen onDone={() => setOnboarded(true)} />;
  }

  return (
    <SessionContext.Provider value={session}>
      <NavigationContainer linking={linking}>
        <TabNavigator />
      </NavigationContainer>
    </SessionContext.Provider>
  );
}
