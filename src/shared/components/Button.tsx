/**
 * Button — Primary | Ghost | Outline
 *
 * - primary: lime bg, dark text. The main CTA.
 * - ghost: transparent bg, lime text + border. Secondary action.
 * - outline: surface bg, border. Tertiary/cancel action.
 * - Shows ActivityIndicator when loading={true}, disables press.
 */

import React from 'react';
import {
  TouchableOpacity,
  ActivityIndicator,
  Text,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'outline';
  loading?: boolean;
  disabled?: boolean;
  size?: 'large' | 'small';
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  size = 'large',
  style,
}: ButtonProps) {
  const { colors, typography: typo, borderRadius, spacing } = useTheme();
  const isDisabled = disabled || loading;

  const containerStyles: ViewStyle[] = [
    styles.base,
    {
      borderRadius: borderRadius.md,
      paddingVertical: size === 'large' ? spacing.ms : spacing.sm,
      paddingHorizontal: size === 'large' ? spacing.lg : spacing.md,
      opacity: isDisabled ? 0.5 : 1,
    },
  ];

  let textColor: string;

  switch (variant) {
    case 'primary':
      containerStyles.push({ backgroundColor: colors.primary });
      textColor = colors.textOnPrimary;
      break;
    case 'ghost':
      containerStyles.push({
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: colors.primary,
      });
      textColor = colors.primary;
      break;
    case 'outline':
      containerStyles.push({
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
      });
      textColor = colors.text;
      break;
  }

  if (style) {
    containerStyles.push(style);
  }

  const textStyles: TextStyle = {
    ...(size === 'large' ? typo.buttonLarge : typo.buttonSmall),
    color: textColor!,
    textAlign: 'center',
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      style={containerStyles}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? colors.textOnPrimary : colors.primary}
          size="small"
        />
      ) : (
        <Text style={textStyles}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
});
