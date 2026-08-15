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
import { ForgotPasswordScreen } from '../../features/auth/ForgotPasswordScreen';
import { ResetPasswordScreen } from '../../features/auth/ResetPasswordScreen';

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
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    </Stack.Navigator>
  );
}
