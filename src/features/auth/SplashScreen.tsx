/**
 * SplashScreen — App entry point.
 *
 * Shows the app name for 1.5s while checking if the user is already logged in.
 * - If token exists → validate via GET /users/me
 *   - Valid + has goal → navigate to AppStack
 *   - Valid + no goal → navigate to Onboarding
 * - If no token or invalid → navigate to LoginScreen
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../shared/hooks/useTheme';
import { useAuthStore } from '../../shared/store/authStore';
import { getMe } from '../../shared/api/user.api';
import type { AuthStackParamList } from '../../shared/navigation/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

type SplashNav = NativeStackNavigationProp<AuthStackParamList, 'Splash'>;

export function SplashScreen() {
  const { colors, typography: typo, spacing } = useTheme();
  const navigation = useNavigation<SplashNav>();

  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      // Minimum splash duration for branding
      const minDelay = new Promise((r) => setTimeout(r, 1500));

      const store = useAuthStore.getState();

      // Wait for hydration if still loading
      if (store.isLoading) {
        await store.hydrate();
      }

      const { accessToken } = useAuthStore.getState();

      const storedOnboarded = await AsyncStorage.getItem('isOnboarded');
      if (storedOnboarded === 'true') {
        useAuthStore.getState().setOnboarded(true);
      }

      if (!accessToken) {
        await minDelay;
        if (!cancelled) navigation.replace('Login');
        return;
      }

      try {
        // Validate the token by fetching user data
        const [user] = await Promise.all([getMe(), minDelay]);

        if (cancelled) return;

        // Update auth store with full user data
        await useAuthStore.getState().setAuth({
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            createdAt: user.createdAt,
          },
          accessToken: useAuthStore.getState().accessToken!,
          refreshToken: useAuthStore.getState().refreshToken!,
        });

        // Set plan from subscription
        if (user.subscription) {
          useAuthStore.getState().setPlan(user.subscription.plan);
        }

        // Check if onboarding is complete (user has a goal)
        if (user.goal) {
          useAuthStore.getState().setOnboarded(true);
          // isAuthenticated is already true from setAuth — RootNavigator shows AppStack
        } else {
          // Need onboarding — navigate there
          navigation.replace('Onboarding');
        }
      } catch {
        // Token is invalid or expired — clear and go to login
        await useAuthStore.getState().clearAuth();
        if (!cancelled) navigation.replace('Login');
      }
    }

    checkAuth();
    return () => {
      cancelled = true;
    };
  }, [navigation]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[typo.number, { color: colors.primary, letterSpacing: -2 }]}>
        FitApp
      </Text>
      <Text
        style={[
          typo.bodySmall,
          { color: colors.textDim, marginTop: spacing.xs },
        ]}
      >
        AI-Powered Fitness
      </Text>
      <ActivityIndicator
        color={colors.primary}
        size="small"
        style={{ marginTop: spacing.xl }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
