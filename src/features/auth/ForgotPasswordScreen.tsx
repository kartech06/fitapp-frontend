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
import { forgotPassword } from '../../shared/api/auth.api';
import { forgotPasswordSchema, type ForgotPasswordFormData } from './schemas';
import type { AuthStackParamList } from '../../shared/navigation/types';

type ForgotPasswordNav = NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen() {
  const { colors, typography: typo, spacing, borderRadius } = useTheme();
  const navigation = useNavigation<ForgotPasswordNav>();
  const insets = useSafeAreaInsets();
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setApiError(null);
    setLoading(true);

    try {
      await forgotPassword(data.email.toLowerCase().trim());
      // Navigate to step 2 regardless of whether email exists or not
      navigation.navigate('ResetPassword', { email: data.email.toLowerCase().trim() });
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Something went wrong. Please try again.';
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
            paddingTop: insets.top + spacing.lg,
            paddingBottom: insets.bottom + spacing.lg,
            paddingHorizontal: spacing.lg,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <Text style={[typo.h1, { color: colors.text, marginBottom: spacing.xs }]}>
          Reset Password
        </Text>
        <Text style={[typo.body, { color: colors.textDim, marginBottom: spacing.xl }]}>
          Enter your email and we'll send you a code to reset your password.
        </Text>

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
            <Text style={[typo.bodySmall, { color: colors.error, marginLeft: spacing.sm, flex: 1 }]}>
              {apiError}
            </Text>
          </View>
        )}

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

        <Button
          title="Send Reset Code"
          onPress={handleSubmit(onSubmit)}
          loading={loading}
          style={{ marginTop: spacing.lg }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center' },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 10,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
});
