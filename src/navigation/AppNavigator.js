import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Platform, StyleSheet, View } from 'react-native';
import { COLORS, RADIUS } from '../config';

// Screens
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

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

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

const ICONS = {
  Camera: ['camera', 'camera-outline'],
  Collection: ['grid', 'grid-outline'],
  Friends: ['people', 'people-outline'],
  Profile: ['happy', 'happy-outline'],
};

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          const [active, inactive] = ICONS[route.name] || ICONS.Camera;
          return (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <Ionicons
                name={focused ? active : inactive}
                size={focused ? size + 1 : size}
                color={color}
              />
            </View>
          );
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabBarItem,
        tabBarLabelStyle: styles.tabBarLabel,
      })}
    >
      <Tab.Screen
        name="Camera"
        component={CameraStack}
        options={{ tabBarLabel: 'Capture' }}
      />
      <Tab.Screen
        name="Collection"
        component={CollectionStack}
        options={{ tabBarLabel: 'Stickers' }}
      />
      <Tab.Screen
        name="Friends"
        component={FriendsStack}
        options={{ tabBarLabel: 'Friends' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{ tabBarLabel: 'Me' }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: Platform.OS === 'ios' ? 26 : 16,
    height: 68,
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 6,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderTopWidth: 0,
    shadowColor: 'rgba(91,75,214,0.28)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 12,
  },
  tabBarItem: {
    borderRadius: RADIUS.lg,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  iconWrap: {
    width: 40,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.pill,
  },
  iconWrapActive: {
    backgroundColor: `${COLORS.primary}16`,
  },
});

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <TabNavigator />
    </NavigationContainer>
  );
}
