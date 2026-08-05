/**
 * RootNavigator — Top-level navigator.
 *
 * Reads authStore state to determine which stack to show:
 *   - Not authenticated → AuthStack (splash → login → register → onboarding)
 *   - Authenticated → TabNavigator (main app)
 *
 * The SplashScreen inside AuthStack handles the token validation
 * and routes to Login or Onboarding as needed. Once `setAuth()` +
 * `setOnboarded(true)` are called, `isAuthenticated` becomes true
 * and this navigator automatically switches to TabNavigator.
 */

import React from 'react';
import {
  NavigationContainer,
  DefaultTheme,
  type Theme as NavTheme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../hooks/useTheme';
import { AuthStack } from './AuthStack';
import { TabNavigator } from './TabNavigator';
import { WorkoutLogScreen } from '../../features/workout/WorkoutLogScreen';
import { WorkoutHistoryScreen } from '../../features/workout/WorkoutHistoryScreen';
import { DietPlanScreen } from '../../features/nutrition/DietPlanScreen';
import { EditGoalsScreen } from '../../features/profile/EditGoalsScreen';
import { EditProfileScreen } from '../../features/profile/EditProfileScreen';
import { SubscriptionScreen } from '../../features/profile/SubscriptionScreen';
import { OnboardingScreen } from '../../features/auth/OnboardingScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isOnboarded = useAuthStore((s) => s.isOnboarded);
  const { colors, dark } = useTheme();

  // Map our theme colors to React Navigation v7's theme (requires fonts)
  const navTheme: NavTheme = {
    dark,
    fonts: DefaultTheme.fonts,
    colors: {
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      notification: colors.error,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          // State 1: Not logged in → show login/register
          <Stack.Screen name="Auth" component={AuthStack} />
        ) : !isOnboarded ? (
          // State 2: Logged in but not onboarded → show onboarding directly
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          // State 3: Fully authenticated and onboarded → show main app
          <>
            <Stack.Screen name="App" component={TabNavigator} />
            <Stack.Screen name="WorkoutLog" component={WorkoutLogScreen} />
            <Stack.Screen name="WorkoutHistory" component={WorkoutHistoryScreen} />
            <Stack.Screen name="DietPlan" component={DietPlanScreen} />
            <Stack.Screen name="EditGoals" component={EditGoalsScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="Subscription" component={SubscriptionScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
