import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { ROUTES, TABS } from '../../config';
import { COLORS, RADIUS, SHADOW } from '../../theme';
import { TabIcon } from '../../components';
import { AuthScreen } from '../../features/auth';
import { PetScreen, TravelGuideScreen, WardrobeScreen } from '../../features/buddy';
import { CameraScreen, StickerResultScreen } from '../../features/capture';
import { CollectionScreen, StickerDetailScreen } from '../../features/collection';
import { FriendsScreen, FriendProfileScreen } from '../../features/friends';
import {
  AppSettingsScreen,
  EditProfileScreen,
  GoalSettingScreen,
  HelpScreen,
  LanguageSelectScreen,
  PrivacyPolicyScreen,
  ProfileScreen,
} from '../../features/profile';
import { ReviewScreen } from '../../features/review';
import { SubscriptionScreen } from '../../features/subscription';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const STACK_OPTIONS = { headerShown: false };
const MODAL = { presentation: 'modal' };

function PetStack() {
  return (
    <Stack.Navigator screenOptions={STACK_OPTIONS}>
      <Stack.Screen name={ROUTES.PET_MAIN} component={PetScreen} />
      <Stack.Screen name={ROUTES.WARDROBE} component={WardrobeScreen} />
      <Stack.Screen name={ROUTES.TRAVEL_GUIDE} component={TravelGuideScreen} />
      <Stack.Screen name={ROUTES.REVIEW} component={ReviewScreen} />
    </Stack.Navigator>
  );
}

function CameraStack() {
  return (
    <Stack.Navigator screenOptions={STACK_OPTIONS}>
      <Stack.Screen name={ROUTES.CAMERA_MAIN} component={CameraScreen} />
      <Stack.Screen name={ROUTES.STICKER_RESULT} component={StickerResultScreen} options={MODAL} />
      <Stack.Screen name={ROUTES.LANGUAGE_SELECT} component={LanguageSelectScreen} />
    </Stack.Navigator>
  );
}

function CollectionStack() {
  return (
    <Stack.Navigator screenOptions={STACK_OPTIONS}>
      <Stack.Screen name={ROUTES.COLLECTION_MAIN} component={CollectionScreen} />
      <Stack.Screen name={ROUTES.STICKER_DETAIL} component={StickerDetailScreen} />
      <Stack.Screen name={ROUTES.REVIEW} component={ReviewScreen} />
    </Stack.Navigator>
  );
}

function FriendsStack() {
  return (
    <Stack.Navigator screenOptions={STACK_OPTIONS}>
      <Stack.Screen name={ROUTES.FRIENDS_MAIN} component={FriendsScreen} />
      <Stack.Screen name={ROUTES.FRIEND_PROFILE} component={FriendProfileScreen} />
      <Stack.Screen name={ROUTES.AUTH} component={AuthRoute} options={MODAL} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={STACK_OPTIONS}>
      <Stack.Screen name={ROUTES.PROFILE_MAIN} component={ProfileScreen} />
      <Stack.Screen name={ROUTES.AUTH} component={AuthRoute} options={MODAL} />
      <Stack.Screen name={ROUTES.SUBSCRIPTION} component={SubscriptionScreen} />
      <Stack.Screen name={ROUTES.LANGUAGE_SELECT} component={LanguageSelectScreen} />
      <Stack.Screen name={ROUTES.GOAL_SETTING} component={GoalSettingScreen} />
      <Stack.Screen name={ROUTES.EDIT_PROFILE} component={EditProfileScreen} />
      <Stack.Screen name={ROUTES.APP_SETTINGS} component={AppSettingsScreen} />
      <Stack.Screen name={ROUTES.HELP} component={HelpScreen} />
      <Stack.Screen name={ROUTES.PRIVACY_POLICY} component={PrivacyPolicyScreen} />
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

// Tab order, label and icon in one table: adding a tab is one row here plus
// its stack above. Snap sits in the middle as the raised main action.
const TAB_SCREENS = [
  { name: TABS.BUDDY, component: PetStack, label: 'HOME', icon: 'home' },
  { name: TABS.COLLECTION, component: CollectionStack, label: 'WORDS', icon: 'book' },
  { name: TABS.CAMERA, component: CameraStack, label: 'SNAP', icon: 'camera', raised: true },
  { name: TABS.FRIENDS, component: FriendsStack, label: 'PALS', icon: 'pals' },
  { name: TABS.PROFILE, component: ProfileStack, label: 'ME', icon: 'me' },
];

const TAB_BY_NAME = Object.fromEntries(TAB_SCREENS.map((tab) => [tab.name, tab]));

function TabBarIcon({ routeName, focused }) {
  const tab = TAB_BY_NAME[routeName];
  if (tab?.raised) {
    return (
      <View style={[styles.raised, focused && styles.raisedActive]}>
        <TabIcon name={tab.icon} size={26} />
        <Text style={styles.raisedLabel}>{tab.label}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.iconWrap, focused ? styles.iconWrapActive : styles.iconWrapIdle]}>
      <TabIcon name={tab?.icon} size={focused ? 24 : 22} />
    </View>
  );
}

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => <TabBarIcon routeName={route.name} focused={focused} />,
        tabBarActiveTintColor: COLORS.water,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabBarItem,
        tabBarLabelStyle: styles.tabBarLabel,
      })}
    >
      {TAB_SCREENS.map((tab) => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={{ tabBarLabel: tab.raised ? () => null : tab.label }}
        />
      ))}
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
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
    marginTop: 1,
  },
  iconWrap: {
    width: 44,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconWrapIdle: {
    opacity: 0.6,
  },
  iconWrapActive: {
    backgroundColor: `${COLORS.sky}55`,
    borderColor: COLORS.water,
  },
  // Snap pokes up out of the bar and carries its own label.
  raised: {
    width: 62,
    height: 62,
    marginTop: -14,
    gap: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.streak,
    borderRadius: RADIUS.xl,
    borderWidth: 3,
    borderColor: COLORS.outline,
    ...SHADOW.glow,
  },
  raisedLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    color: COLORS.surface,
  },
  raisedActive: {
    backgroundColor: COLORS.secondary,
  },
});
