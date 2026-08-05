/**
 * AuthStack — Unauthenticated screens.
 *
 * Splash → Login → Register → Onboarding
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AuthStackParamList } from './types';
import { SplashScreen } from '../../features/auth/SplashScreen';
import { LoginScreen } from '../../features/auth/LoginScreen';
import { RegisterScreen } from '../../features/auth/RegisterScreen';
import { OnboardingScreen } from '../../features/auth/OnboardingScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
    </Stack.Navigator>
  );
}
