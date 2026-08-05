/**
 * ScreenHeader — Title + optional back button + optional right action.
 *
 * Uses useSafeAreaInsets() for proper top padding.
 */

import React, { type ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

export interface ScreenHeaderProps {
  title: string;
  onBack?: () => void;
  rightAction?: ReactNode;
}

export function ScreenHeader({ title, onBack, rightAction }: ScreenHeaderProps) {
  const { colors, typography: typo, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + spacing.sm,
          paddingBottom: spacing.sm,
          paddingHorizontal: spacing.md,
          backgroundColor: colors.background,
        },
      ]}
    >
      {/* Left: back button or spacer */}
      <View style={styles.left}>
        {onBack ? (
          <TouchableOpacity
            onPress={onBack}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.spacer} />
        )}
      </View>

      {/* Center: title */}
      <Text
        style={[typo.h3, { color: colors.text, flex: 1 }]}
        numberOfLines={1}
      >
        {title}
      </Text>

      {/* Right: optional action */}
      <View style={styles.right}>
        {rightAction || <View style={styles.spacer} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  left: {
    width: 40,
    alignItems: 'flex-start',
  },
  right: {
    width: 40,
    alignItems: 'flex-end',
  },
  spacer: {
    width: 24,
  },
});
