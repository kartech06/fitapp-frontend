/**
 * Badge — Small pill for plan type, streak, and confidence.
 *
 * Variants:
 *   plan:       FREE = gray bg  |  BASIC = lime bg with dark text
 *   streak:     coral bg
 *   confidence: high = lime  |  medium = amber  |  low = gray
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';

export type BadgeVariant =
  | { type: 'plan'; plan: 'FREE' | 'BASIC' }
  | { type: 'streak'; count: number }
  | { type: 'confidence'; level: 'high' | 'medium' | 'low' };

export interface BadgeProps {
  variant: BadgeVariant;
}

export function Badge({ variant }: BadgeProps) {
  const { colors, typography: typo, spacing, borderRadius } = useTheme();

  let backgroundColor: string;
  let textColor: string;
  let text: string;

  switch (variant.type) {
    case 'plan':
      if (variant.plan === 'BASIC') {
        backgroundColor = colors.primary;
        textColor = colors.textOnPrimary;
        text = 'BASIC';
      } else {
        backgroundColor = colors.surface2;
        textColor = colors.textDim;
        text = 'FREE';
      }
      break;

    case 'streak':
      backgroundColor = colors.error;
      textColor = '#FFFFFF';
      text = `🔥 ${variant.count} day streak`;
      break;

    case 'confidence':
      switch (variant.level) {
        case 'high':
          backgroundColor = colors.primary;
          textColor = colors.textOnPrimary;
          text = 'High';
          break;
        case 'medium':
          backgroundColor = colors.warning;
          textColor = '#0B0E11';
          text = 'Medium';
          break;
        case 'low':
          backgroundColor = colors.surface2;
          textColor = colors.textDim;
          text = 'Low';
          break;
      }
      break;
  }

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: backgroundColor!,
          borderRadius: borderRadius.full,
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
        },
      ]}
    >
      <Text style={[typo.caption, { color: textColor! }]}>{text!}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
  },
});
