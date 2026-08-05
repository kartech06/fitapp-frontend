/**
 * AIPanel — Violet-tinted card for ALL AI-generated content.
 *
 * DESIGN RULE: Every piece of AI-generated content (workout plans, diet plans,
 * onboarding results, chat assistant messages) MUST use this component.
 * Human-logged data uses the plain Card component.
 *
 * This visual distinction — "human logged vs AI assembled" — is the app's
 * design signature. It makes the difference physically legible.
 *
 * Features:
 * - Violet-tinted background and border
 * - ✦ sparkle icon + "AI" label at top-left
 * - 20px border radius
 */

import React, { type ReactNode } from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '../hooks/useTheme';

export interface AIPanelProps {
  children: ReactNode;
  /** Optional label override (default: "AI") */
  label?: string;
  style?: ViewStyle;
}

export function AIPanel({ children, label = 'AI', style }: AIPanelProps) {
  const { colors, typography: typo, spacing, borderRadius } = useTheme();

  return (
    <View
      style={[
        styles.panel,
        {
          backgroundColor: colors.aiBackground,
          borderColor: colors.aiBorder,
          borderRadius: borderRadius.xl,
          padding: spacing.md,
        },
        style,
      ]}
    >
      {/* AI indicator badge */}
      <View style={[styles.badge, { marginBottom: spacing.sm }]}>
        <Text style={[styles.sparkle, { color: colors.secondary }]}>✦</Text>
        <Text
          style={[
            typo.caption,
            {
              color: colors.secondary,
              marginLeft: spacing.xs,
              textTransform: 'uppercase',
            },
          ]}
        >
          {label}
        </Text>
      </View>

      {/* Content */}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderWidth: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sparkle: {
    fontSize: 14,
  },
});
