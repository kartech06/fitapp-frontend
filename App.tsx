/**
 * FitApp — Entry Point
 *
 * Wraps the app in:
 * 1. QueryClientProvider (TanStack Query)
 * 2. PaperProvider (React Native Paper with custom theme)
 * 3. SafeAreaProvider
 * 4. RootNavigator
 *
 * Hydrates auth tokens + theme preference on mount.
 */

import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { Provider as PaperProvider, MD3DarkTheme, MD3LightTheme } from 'react-native-paper';

import { queryClient } from './src/shared/api/queryClient';
import { useAuthStore } from './src/shared/store/authStore';
import { useThemeStore } from './src/shared/store/themeStore';
import { RootNavigator } from './src/shared/navigation/RootNavigator';
import { darkColors, lightColors } from './src/shared/theme/colors';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
  webClientId: '279696333333-1vu4ivdeqp57ppfmlsra2ebrardhprgp.apps.googleusercontent.com',
  offlineAccess: false,
});

export default function App() {
  const [ready, setReady] = useState(false);
  const isDark = useThemeStore((s) => s.isDark);

  useEffect(() => {
    async function init() {
      await Promise.all([
        useAuthStore.getState().hydrate(),
        useThemeStore.getState().hydrate(),
      ]);
      setReady(true);
    }
    init();
  }, []);

  // Build a React Native Paper theme from our colors
  const colors = isDark ? darkColors : lightColors;
  const paperTheme = isDark
    ? {
        ...MD3DarkTheme,
        colors: {
          ...MD3DarkTheme.colors,
          primary: colors.primary,
          secondary: colors.secondary,
          error: colors.error,
          background: colors.background,
          surface: colors.surface,
          onPrimary: colors.textOnPrimary,
          onBackground: colors.text,
          onSurface: colors.text,
          outline: colors.border,
        },
      }
    : {
        ...MD3LightTheme,
        colors: {
          ...MD3LightTheme.colors,
          primary: colors.primary,
          secondary: colors.secondary,
          error: colors.error,
          background: colors.background,
          surface: colors.surface,
          onPrimary: colors.textOnPrimary,
          onBackground: colors.text,
          onSurface: colors.text,
          outline: colors.border,
        },
      };

  if (!ready) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={paperTheme}>
        <SafeAreaProvider>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <RootNavigator />
        </SafeAreaProvider>
      </PaperProvider>
    </QueryClientProvider>
  );
}
