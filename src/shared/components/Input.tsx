/**
 * Input — Text input with label, error, and password toggle.
 *
 * - Label rendered above the input
 * - Error message below in coral when present
 * - Eye toggle icon for secure text entry
 * - Focus state: primary-colored border
 */

import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  type TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string;
  secure?: boolean;
  style?: import('react-native').StyleProp<import('react-native').ViewStyle>;
}

export function Input({ label, error, secure, style, ...rest }: InputProps) {
  const { colors, typography: typo, spacing, borderRadius } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={[{ marginBottom: spacing.md }, style]}>
      {/* Label */}
      <Text
        style={[
          typo.label,
          { color: colors.textDim, marginBottom: spacing.xs },
        ]}
      >
        {label}
      </Text>

      {/* Input container */}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.surface2,
            borderRadius: borderRadius.md,
            borderColor: error
              ? colors.error
              : isFocused
                ? colors.primary
                : colors.border,
          },
        ]}
      >
        <TextInput
          {...rest}
          secureTextEntry={secure && !showPassword}
          onFocus={(e) => {
            setIsFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            rest.onBlur?.(e);
          }}
          placeholderTextColor={colors.textDim}
          style={[
            typo.body,
            styles.input,
            { color: colors.text },
          ]}
        />

        {/* Password toggle */}
        {secure && (
          <TouchableOpacity
            onPress={() => setShowPassword((prev) => !prev)}
            style={styles.eyeButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.textDim}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Error message */}
      {error ? (
        <Text
          style={[
            typo.caption,
            { color: colors.error, marginTop: spacing.xs },
          ]}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
  },
  eyeButton: {
    marginLeft: 8,
  },
});
