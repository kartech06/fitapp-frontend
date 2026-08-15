import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../shared/hooks/useTheme';
import { Button } from '../../shared/components/Button';
import { Input } from '../../shared/components/Input';
import { resetPassword, forgotPassword } from '../../shared/api/auth.api';
import { resetPasswordSchema, type ResetPasswordFormData } from './schemas';
import type { AuthStackParamList } from '../../shared/navigation/types';

type ResetPasswordNav = NativeStackNavigationProp<AuthStackParamList, 'ResetPassword'>;
type ResetPasswordRoute = RouteProp<AuthStackParamList, 'ResetPassword'>;

export function ResetPasswordScreen() {
  const { colors, typography: typo, spacing, borderRadius } = useTheme();
  const navigation = useNavigation<ResetPasswordNav>();
  const route = useRoute<ResetPasswordRoute>();
  const insets = useSafeAreaInsets();
  
  const { email } = route.params;
  
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { code: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    setApiError(null);
    setLoading(true);

    try {
      await resetPassword({
        code: data.code,
        newPassword: data.password,
      });
      
      Alert.alert(
        'Password Reset',
        'Your password has been successfully reset. You can now sign in with your new password.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Invalid or expired reset code. Please try again.';
      setApiError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setApiError(null);
    try {
      await forgotPassword(email);
      Alert.alert('Code Sent', 'A new reset code has been sent to your email.');
    } catch (err: any) {
      setApiError('Failed to resend code. Please try again.');
    } finally {
      setResending(false);
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
          Enter Code
        </Text>
        <Text style={[typo.body, { color: colors.textDim, marginBottom: spacing.xl }]}>
          We sent a 6-digit code to {email}
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
          name="code"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Reset Code"
              placeholder="123456"
              keyboardType="number-pad"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.code?.message}
              maxLength={6}
            />
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="New Password"
              placeholder="Enter new password"
              secure
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.password?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Confirm New Password"
              placeholder="Confirm new password"
              secure
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.confirmPassword?.message}
            />
          )}
        />

        <Button
          title="Reset Password"
          onPress={handleSubmit(onSubmit)}
          loading={loading}
          style={{ marginTop: spacing.md }}
        />

        <View style={[styles.footer, { marginTop: spacing.xl }]}>
          <Text style={[typo.body, { color: colors.textDim }]}>
            Didn't receive the code?{' '}
          </Text>
          <TouchableOpacity onPress={handleResend} disabled={resending}>
            <Text style={[typo.body, { color: colors.primary, fontWeight: '600' }]}>
              {resending ? 'Sending...' : 'Resend Code'}
            </Text>
          </TouchableOpacity>
        </View>
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
  footer: { flexDirection: 'row', justifyContent: 'center' },
});
