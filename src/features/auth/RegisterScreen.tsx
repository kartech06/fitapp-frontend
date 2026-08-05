/**
 * RegisterScreen — Name, email, password, confirmPassword
 *
 * On success: auto-login → navigate to Onboarding (new users always need it).
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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
import { register } from '../../shared/api/auth.api';
import { getMe } from '../../shared/api/user.api';
import { registerSchema, type RegisterFormData } from './schemas';
import type { AuthStackParamList } from '../../shared/navigation/types';

type RegisterNav = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

export function RegisterScreen() {
  const { colors, typography: typo, spacing, borderRadius } = useTheme();
  const navigation = useNavigation<RegisterNav>();
  const insets = useSafeAreaInsets();
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setApiError(null);
    setLoading(true);

    try {
      const authRes = await register({
        name: data.name.trim(),
        email: data.email.toLowerCase().trim(),
        password: data.password,
      });

      // RootNavigator automatically shows OnboardingScreen when
      // isAuthenticated=true && isOnboarded=false — no navigation.navigate needed
      await useAuthStore.getState().setAuth({
        user: authRes.user,
        accessToken: authRes.accessToken,
        refreshToken: authRes.refreshToken,
      });
    } catch (err: any) {
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
        <Text
          style={[typo.h1, { color: colors.text, marginBottom: spacing.xs }]}
        >
          Create account
        </Text>
        <Text
          style={[
            typo.body,
            { color: colors.textDim, marginBottom: spacing.xl },
          ]}
        >
          Start your AI-powered fitness journey
        </Text>

        {/* API error */}
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

        {/* Name */}
        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Name"
              placeholder="Your name"
              autoCapitalize="words"
              autoComplete="name"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.name?.message}
            />
          )}
        />

        {/* Email */}
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

        {/* Password */}
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Password"
              placeholder="Create a password"
              secure
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.password?.message}
            />
          )}
        />

        {/* Confirm Password */}
        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Confirm Password"
              placeholder="Re-enter your password"
              secure
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.confirmPassword?.message}
            />
          )}
        />

        {/* Submit */}
        <Button
          title="Create Account"
          onPress={handleSubmit(onSubmit)}
          loading={loading}
          style={{ marginTop: spacing.sm }}
        />

        {/* Login link */}
        <View style={[styles.footer, { marginTop: spacing.xl }]}>
          <Text style={[typo.body, { color: colors.textDim }]}>
            Already have an account?{' '}
          </Text>
          <Text
            style={[typo.body, { color: colors.primary, fontWeight: '600' }]}
            onPress={() => navigation.goBack()}
          >
            Sign In
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
  footer: { flexDirection: 'row', justifyContent: 'center' },
});
