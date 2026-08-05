/**
 * MacroBar — Horizontal segmented bar for protein / carbs / fat.
 *
 * Segments are proportional to consumed amounts.
 * Color coding:
 *   Protein = primary (lime)
 *   Carbs   = secondary (violet)
 *   Fat     = error (coral)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';

export interface MacroBarProps {
  protein: { consumed: number; goal: number };
  carbs: { consumed: number; goal: number };
  fat: { consumed: number; goal: number };
  /** Bar height in px (default 8) */
  height?: number;
  /** Whether to show labels below (default true) */
  showLabels?: boolean;
}

export function MacroBar({
  protein,
  carbs,
  fat,
  height = 8,
  showLabels = true,
}: MacroBarProps) {
  const { colors, typography: typo, spacing, borderRadius } = useTheme();

  const total = protein.consumed + carbs.consumed + fat.consumed;

  // Prevent division by zero
  const pPct = total > 0 ? (protein.consumed / total) * 100 : 33;
  const cPct = total > 0 ? (carbs.consumed / total) * 100 : 34;
  const fPct = total > 0 ? (fat.consumed / total) * 100 : 33;

  return (
    <View>
      {/* Segmented bar */}
      <View
        style={[
          styles.track,
          {
            height,
            backgroundColor: colors.border,
            borderRadius: borderRadius.full,
            overflow: 'hidden',
          },
        ]}
      >
        {total > 0 && (
          <>
            <View
              style={{
                width: `${pPct}%`,
                height: '100%',
                backgroundColor: colors.primary,
              }}
            />
            <View
              style={{
                width: `${cPct}%`,
                height: '100%',
                backgroundColor: colors.secondary,
              }}
            />
            <View
              style={{
                width: `${fPct}%`,
                height: '100%',
                backgroundColor: colors.error,
              }}
            />
          </>
        )}
      </View>

      {/* Labels */}
      {showLabels && (
        <View style={[styles.labels, { marginTop: spacing.sm }]}>
          <MacroLabel
            label="P"
            consumed={protein.consumed}
            goal={protein.goal}
            color={colors.primary}
            typo={typo}
            dimColor={colors.textDim}
          />
          <MacroLabel
            label="C"
            consumed={carbs.consumed}
            goal={carbs.goal}
            color={colors.secondary}
            typo={typo}
            dimColor={colors.textDim}
          />
          <MacroLabel
            label="F"
            consumed={fat.consumed}
            goal={fat.goal}
            color={colors.error}
            typo={typo}
            dimColor={colors.textDim}
          />
        </View>
      )}
    </View>
  );
}

function MacroLabel({
  label,
  consumed,
  goal,
  color,
  typo,
  dimColor,
}: {
  label: string;
  consumed: number;
  goal: number;
  color: string;
  typo: any;
  dimColor: string;
}) {
  return (
    <View style={styles.labelItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[typo.caption, { color: dimColor, flexShrink: 1 }]} numberOfLines={1}>
        {label}: {Math.round(consumed)}/{Math.round(goal)}g
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    rowGap: 4,
    columnGap: 8,
  },
  labelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
});
