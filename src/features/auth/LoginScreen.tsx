/**
 * LoginScreen — Email/password login with React Hook Form + Zod.
 *
 * On success: saves tokens → checks if user has goal → navigates to
 * AppStack (via isAuthenticated) or Onboarding.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../shared/hooks/useTheme';
import { Button } from '../../shared/components/Button';
import { Input } from '../../shared/components/Input';
import { useAuthStore } from '../../shared/store/authStore';
import { login } from '../../shared/api/auth.api';
import { getMe } from '../../shared/api/user.api';
import { loginSchema, type LoginFormData } from './schemas';
import type { AuthStackParamList } from '../../shared/navigation/types';

type LoginNav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export function LoginScreen() {
  const { colors, typography: typo, spacing, borderRadius } = useTheme();
  const navigation = useNavigation<LoginNav>();
  const insets = useSafeAreaInsets();
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginFormData) => {
    setApiError(null);
    setLoading(true);

    try {
      // 1. Login
      const authRes = await login({
        email: data.email.toLowerCase().trim(),
        password: data.password,
      });

      console.log('AUTH RESPONSE:', JSON.stringify(authRes, null, 2));
      console.log('accessToken type:', typeof authRes.accessToken);
      console.log('refreshToken type:', typeof authRes.refreshToken);

      // 2. Save tokens + user
      await useAuthStore.getState().setAuth({
        user: authRes.user,
        accessToken: authRes.accessToken,
        refreshToken: authRes.refreshToken,
      });

      // 3. Fetch full user to check onboarding status + plan
      const me = await getMe();

      if (me.subscription) {
        useAuthStore.getState().setPlan(me.subscription.plan);
      }

      if (me.goal) {
        // Onboarding complete — RootNavigator will show AppStack
        useAuthStore.getState().setOnboarded(true);
      } else {
        // Needs onboarding
        navigation.replace('Onboarding');
      }
    } catch (err: any) {
      console.log('LOGIN ERROR:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
      console.log('err.message:', err?.message);
      console.log('err.code:', err?.code);
      console.log('err.response:', err?.response);
      const message =
        err?.response?.data?.message || 'Something went wrong. Please try again.';
      setApiError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + spacing.xxl,
            paddingBottom: insets.bottom + spacing.lg,
            paddingHorizontal: spacing.lg,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <Text style={[typo.h1, { color: colors.text, marginBottom: spacing.xs }]}>
          Welcome back
        </Text>
        <Text
          style={[
            typo.body,
            { color: colors.textDim, marginBottom: spacing.xl },
          ]}
        >
          Sign in to continue tracking your fitness
        </Text>

        {/* API error banner */}
        {apiError && (
          <View
            style={[
              styles.errorBanner,
              {
                backgroundColor: `${colors.error}15`,
                borderColor: colors.error,
                borderRadius: borderRadius.md,
                padding: spacing.ms,
                marginBottom: spacing.md,
              },
            ]}
          >
            <Ionicons name="alert-circle" size={18} color={colors.error} />
            <Text
              style={[
                typo.bodySmall,
                { color: colors.error, marginLeft: spacing.sm, flex: 1 },
              ]}
            >
              {apiError}
            </Text>
          </View>
        )}

        {/* Email field */}
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Email"
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.email?.message}
            />
          )}
        />

        {/* Password field */}
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Password"
              placeholder="Enter your password"
              secure
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.password?.message}
            />
          )}
        />

        {/* Login button */}
        <Button
          title="Sign In"
          onPress={handleSubmit(onSubmit)}
          loading={loading}
          style={{ marginTop: spacing.sm }}
        />

        {/* Divider */}
        <View style={[styles.divider, { marginVertical: spacing.lg }]}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <Text
            style={[
              typo.caption,
              { color: colors.textDim, marginHorizontal: spacing.ms },
            ]}
          >
            OR
          </Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>

        {/* Google Sign In (UI only) */}
        <TouchableOpacity
          style={[
            styles.socialButton,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: borderRadius.md,
              paddingVertical: spacing.ms,
            },
          ]}
          activeOpacity={0.7}
          onPress={() => {
            // TODO: Wire up Google OAuth when credentials are configured
          }}
        >
          <Ionicons name="logo-google" size={20} color={colors.text} />
          <Text
            style={[
              typo.buttonSmall,
              { color: colors.text, marginLeft: spacing.sm },
            ]}
          >
            Continue with Google
          </Text>
        </TouchableOpacity>

        {/* Register link */}
        <View style={[styles.footer, { marginTop: spacing.xl }]}>
          <Text style={[typo.body, { color: colors.textDim }]}>
            Don't have an account?{' '}
          </Text>
          <Text
            style={[typo.body, { color: colors.primary, fontWeight: '600' }]}
            onPress={() => navigation.navigate('Register')}
          >
            Sign Up
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center' },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  divider: { flexDirection: 'row', alignItems: 'center' },
  dividerLine: { flex: 1, height: 1 },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    minHeight: 48,
  },
  footer: { flexDirection: 'row', justifyContent: 'center' },
});
