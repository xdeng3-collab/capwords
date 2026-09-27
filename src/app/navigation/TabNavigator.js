import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Platform, StyleSheet, View } from 'react-native';
import { ROUTES, TABS } from '../../config';
import { COLORS, RADIUS, SHADOW } from '../../theme';
import { PixelIcon } from '../../components';
import { AuthScreen } from '../../features/auth';
import { PetScreen, WardrobeScreen } from '../../features/buddy';
import { CameraScreen, StickerResultScreen } from '../../features/capture';
import { CollectionScreen, StickerDetailScreen } from '../../features/collection';
import { FriendsScreen, FriendProfileScreen } from '../../features/friends';
import { GoalSettingScreen, LanguageSelectScreen, ProfileScreen } from '../../features/profile';
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
// its stack above.
const TAB_SCREENS = [
  { name: TABS.BUDDY, component: PetStack, label: 'BUDDY', icon: 'heart' },
  { name: TABS.CAMERA, component: CameraStack, label: 'SNAP', icon: 'camera' },
  { name: TABS.COLLECTION, component: CollectionStack, label: 'BOOK', icon: 'grid' },
  { name: TABS.FRIENDS, component: FriendsStack, label: 'PALS', icon: 'people' },
  { name: TABS.PROFILE, component: ProfileStack, label: 'ME', icon: 'gear' },
];

const TAB_ICONS = Object.fromEntries(TAB_SCREENS.map((tab) => [tab.name, tab.icon]));

function TabBarIcon({ routeName, focused, color }) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <PixelIcon name={TAB_ICONS[routeName] || 'star'} size={focused ? 20 : 18} color={color} />
    </View>
  );
}

export default function TabNavigator() {
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
      {TAB_SCREENS.map((tab) => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={{ tabBarLabel: tab.label }}
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
