/**
 * TabNavigator — Bottom tab bar with 5 tabs.
 *
 * Today | Workout | Nutrition | Coach | Profile
 *
 * Tab bar colors from theme, active tint = primary (lime).
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import type { AppTabParamList } from './types';
import { useTheme } from '../hooks/useTheme';

// Screens
import { DashboardScreen } from '../../features/dashboard/DashboardScreen';
import { WorkoutScreen } from '../../features/workout/WorkoutScreen';
import { NutritionScreen } from '../../features/nutrition/NutritionScreen';
import { CoachScreen } from '../../features/chat/CoachScreen';
import { ProfileScreen } from '../../features/profile/ProfileScreen';

const Tab = createBottomTabNavigator<AppTabParamList>();

const TAB_ICONS: Record<keyof AppTabParamList, keyof typeof Ionicons.glyphMap> = {
  Today: 'home',
  Workout: 'barbell',
  Nutrition: 'leaf',
  Coach: 'chatbubble-ellipses',
  Profile: 'person',
};

export function TabNavigator() {
  const { colors, typography: typo } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: typo.caption.fontSize,
          fontWeight: typo.caption.fontWeight,
        },
        tabBarIcon: ({ color, size }) => {
          const iconName = TAB_ICONS[route.name];
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Today" component={DashboardScreen} />
      <Tab.Screen name="Workout" component={WorkoutScreen} />
      <Tab.Screen name="Nutrition" component={NutritionScreen} />
      <Tab.Screen name="Coach" component={CoachScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
