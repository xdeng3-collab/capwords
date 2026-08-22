import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Platform, StyleSheet, View, Text } from 'react-native';
import { COLORS, RADIUS, SHADOW } from '../config';
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
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
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

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <TabNavigator />
    </NavigationContainer>
  );
}
