/**
 * MacroSummaryCard — Displays actual vs target macros for the active diet plan.
 *
 * Requirements:
 * - GET /diet-plans/active/summary
 * - Show protein/carbs/fat actual vs target with colored bars
 * - % deviation shown (within 10% = green, outside = amber)
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../shared/hooks/useTheme';
import { Card } from '../../shared/components/Card';
import { getDietPlanSummary, type DietPlanSummary } from '../../shared/api/nutrition.api';
import { formatCalories } from '../../shared/utils/format';
import { Ionicons } from '@expo/vector-icons';

interface MacroRowProps {
  label: string;
  actual: number;
  target: number;
  barColor: string;
}

function MacroRow({ label, actual, target, barColor }: MacroRowProps) {
  const { colors, typography: typo, spacing, borderRadius } = useTheme();

  const diff = actual - target;
  const pct = target > 0 ? Math.round((diff / target) * 100) : 0;
  const isWithin10 = Math.abs(pct) <= 10;
  const badgeColor = isWithin10 ? colors.success : colors.warning;
  const badgeIcon = isWithin10 ? 'checkmark-circle' : 'alert-circle';
  const sign = pct > 0 ? '+' : '';

  const progress = target > 0 ? Math.min(actual / target, 1) : 0;

  return (
    <View style={styles.macroRowContainer}>
      <View style={styles.macroHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={[styles.colorDot, { backgroundColor: barColor }]} />
          <Text style={[typo.body, { color: colors.text, fontWeight: '600' }]}>{label}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text style={[typo.bodySmall, { color: colors.textSecondary }]}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{actual}g</Text> / {target}g
          </Text>
          <View
            style={[
              styles.deviationBadge,
              {
                backgroundColor: `${badgeColor}18`,
                borderRadius: borderRadius.sm,
              },
            ]}
          >
            <Ionicons name={badgeIcon as any} size={12} color={badgeColor} style={{ marginRight: 2 }} />
            <Text style={[typo.caption, { color: badgeColor, fontSize: 11, fontWeight: '700' }]}>
              {sign}{pct}%
            </Text>
          </View>
        </View>
      </View>

      {/* Bar Track */}
      <View
        style={[
          styles.barTrack,
          {
            backgroundColor: colors.surface2,
            borderRadius: borderRadius.full,
          },
        ]}
      >
        <View
          style={[
            styles.barFill,
            {
              backgroundColor: barColor,
              width: `${Math.max(progress * 100, 2)}%`,
              borderRadius: borderRadius.full,
            },
          ]}
        />
      </View>
    </View>
  );
}

export function MacroSummaryCard() {
  const { colors, typography: typo, spacing, borderRadius } = useTheme();

  const { data: summary, isLoading, error } = useQuery<DietPlanSummary>({
    queryKey: ['dietPlanSummary'],
    queryFn: getDietPlanSummary,
    retry: false,
  });

  if (isLoading) {
    return (
      <Card style={{ marginBottom: spacing.md }}>
        <View style={{ paddingVertical: spacing.md, alignItems: 'center' }}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[typo.caption, { color: colors.textSecondary, marginTop: spacing.xs }]}>
            Loading macro summary...
          </Text>
        </View>
      </Card>
    );
  }

  console.log('DIET SUMMARY RAW:', summary);

  if (error || !summary) {
    return null;
  }

  return (
    <Card style={{ marginBottom: spacing.md }}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={[typo.h3, { color: colors.text }]}>Macro Targets</Text>
          <Text style={[typo.caption, { color: colors.textSecondary, marginTop: 2 }]}>
            Actual vs Planned Daily Goals
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[typo.h3, { color: colors.primary }]}>
            {formatCalories(summary.actual.calories)} / {formatCalories(summary.targets.calories)}
          </Text>
          <Text style={[typo.caption, { color: colors.textSecondary }]}>kcal</Text>
        </View>
      </View>

      <View style={{ marginTop: spacing.md, gap: spacing.md }}>
        <MacroRow
          label="Protein"
          actual={summary.actual.proteinG}
          target={summary.targets.proteinG}
          barColor="#EF4444" // coral/red
        />
        <MacroRow
          label="Carbs"
          actual={summary.actual.carbsG}
          target={summary.targets.carbsG}
          barColor="#3B82F6" // blue
        />
        <MacroRow
          label="Fat"
          actual={summary.actual.fatG}
          target={summary.targets.fatG}
          barColor="#F59E0B" // amber
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  macroRowContainer: {
    width: '100%',
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  deviationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  barTrack: {
    height: 8,
    width: '100%',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
  },
});
