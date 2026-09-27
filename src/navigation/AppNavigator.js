import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Platform, StyleSheet, View, Text } from 'react-native';
import { COLORS, PET, RADIUS, SHADOW } from '../config';
import PixelIcon from '../components/PixelIcon';

// Screens
import PetScreen from '../screens/PetScreen';
import CameraScreen from '../screens/CameraScreen';
import CollectionScreen from '../screens/CollectionScreen';
import FriendsScreen from '../screens/FriendsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import StickerResultScreen from '../screens/StickerResultScreen';
import SubscriptionScreen from '../screens/SubscriptionScreen';
import LanguageSelectScreen from '../screens/LanguageSelectScreen';
import FriendProfileScreen from '../screens/FriendProfileScreen';
import GoalSettingScreen from '../screens/GoalSettingScreen';
import StickerDetailScreen from '../screens/StickerDetailScreen';
import WardrobeScreen from '../screens/WardrobeScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import LoadingScreen from '../screens/LoadingScreen';
import AuthScreen from '../screens/AuthScreen';
import { hasCompletedOnboarding, getPet, removeDemoData } from '../services/storageService';
import { getMyProfile, onAuthChange, pushProgress } from '../services/accountService';
import { SessionContext } from './session';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function PetStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PetMain" component={PetScreen} />
      <Stack.Screen name="Wardrobe" component={WardrobeScreen} />
    </Stack.Navigator>
  );
}

function CameraStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CameraMain" component={CameraScreen} />
      <Stack.Screen
        name="StickerResult"
        component={StickerResultScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen name="LanguageSelect" component={LanguageSelectScreen} />
    </Stack.Navigator>
  );
}

function CollectionStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CollectionMain" component={CollectionScreen} />
      <Stack.Screen name="StickerDetail" component={StickerDetailScreen} />
    </Stack.Navigator>
  );
}

function FriendsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FriendsMain" component={FriendsScreen} />
      <Stack.Screen name="FriendProfile" component={FriendProfileScreen} />
      <Stack.Screen name="Auth" component={AuthRoute} options={{ presentation: 'modal' }} />
    </Stack.Navigator>
  );
}

/**
 * AuthScreen as a route. It is written to be host-agnostic (onboarding shows
 * it inline), so the navigation wiring lives here rather than inside it.
 */
function AuthRoute({ navigation, route }) {
  return (
    <AuthScreen
      initialMode={route.params?.mode || 'signin'}
      onDone={() => navigation.goBack()}
      onCancel={() => navigation.goBack()}
    />
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen name="Auth" component={AuthRoute} options={{ presentation: 'modal' }} />
      <Stack.Screen name="Subscription" component={SubscriptionScreen} />
      <Stack.Screen name="LanguageSelect" component={LanguageSelectScreen} />
      <Stack.Screen name="GoalSetting" component={GoalSettingScreen} />
    </Stack.Navigator>
  );
}

const TAB_ICONS = {
  Buddy: 'heart',
  Camera: 'camera',
  Collection: 'grid',
  Friends: 'people',
  Profile: 'gear',
};

function TabBarIcon({ routeName, focused, color }) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <PixelIcon name={TAB_ICONS[routeName] || 'star'} size={focused ? 20 : 18} color={color} />
    </View>
  );
}

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color }) => (
          <TabBarIcon routeName={route.name} focused={focused} color={color} />
        ),
        tabBarActiveTintColor: COLORS.primaryDark,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabBarItem,
        tabBarLabelStyle: styles.tabBarLabel,
      })}
    >
      <Tab.Screen name="Buddy" component={PetStack} options={{ tabBarLabel: 'BUDDY' }} />
      <Tab.Screen name="Camera" component={CameraStack} options={{ tabBarLabel: 'SNAP' }} />
      <Tab.Screen
        name="Collection"
        component={CollectionStack}
        options={{ tabBarLabel: 'BOOK' }}
      />
      <Tab.Screen name="Friends" component={FriendsStack} options={{ tabBarLabel: 'PALS' }} />
      <Tab.Screen name="Profile" component={ProfileStack} options={{ tabBarLabel: 'ME' }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: Platform.OS === 'ios' ? 24 : 14,
    height: 66,
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 4,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 3,
    borderColor: COLORS.outline,
    borderTopWidth: 3,
    borderTopColor: COLORS.outline,
    ...SHADOW.card,
  },
  tabBarItem: {
    borderRadius: RADIUS.sm,
  },
  tabBarLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
    marginTop: 1,
  },
  iconWrap: {
    width: 38,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.sm,
  },
  iconWrapActive: {
    backgroundColor: COLORS.sun,
    borderWidth: 2,
    borderColor: COLORS.outline,
  },
});

// The home screen widget opens capwords://camera, which lands on the Snap tab.
const linking = {
  prefixes: [Linking.createURL('/'), 'capwords://'],
  config: {
    screens: {
      Buddy: { screens: { PetMain: 'buddy', Wardrobe: 'wardrobe' } },
      Camera: { screens: { CameraMain: 'camera' } },
      Collection: { screens: { CollectionMain: 'book' } },
      Friends: { screens: { FriendsMain: 'pals' } },
      Profile: { screens: { ProfileMain: 'me' } },
    },
  },
};

export default function AppNavigator() {
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
