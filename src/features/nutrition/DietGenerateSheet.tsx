/**
 * DietGenerateSheet — Bottom sheet for generating or regenerating an AI diet plan.
 *
 * Pre-fills goalType and dietPreference from the user's profile (getMe).
 * Calls generateDietPlan or regenerateDietPlan → refreshes queries on success.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../shared/hooks/useTheme';
import { Button } from '../../shared/components/Button';
import {
  generateDietPlan,
  regenerateDietPlan,
} from '../../shared/api/nutrition.api';
import { getMe, type GetMeResponse } from '../../shared/api/user.api';
import {
  GoalType,
  GOAL_LABELS,
  DietPreference,
  DIET_LABELS,
  type GoalType as GoalTypeT,
  type DietPreference as DietPreferenceT,
} from '../../shared/constants';

interface DietGenerateSheetProps {
  visible: boolean;
  onClose: () => void;
  /** If provided, we call regenerateDietPlan instead of generateDietPlan */
  planId?: string;
}

const GOAL_OPTIONS = Object.entries(GOAL_LABELS) as [GoalTypeT, string][];
const DIET_OPTIONS = Object.entries(DIET_LABELS) as [DietPreferenceT, string][];

const FOOD_SOURCE_OPTIONS = [
  { key: 'INDIAN', label: '🇮🇳 Indian (dal, roti, paneer...)' },
  { key: 'GLOBAL', label: '🌍 Global (chicken, pasta, salads...)' },
  { key: 'MIXED', label: '🔀 Mixed (best of both)' },
] as const;

export function DietGenerateSheet({ visible, onClose, planId }: DietGenerateSheetProps) {
  const { colors, typography: typo, spacing, borderRadius } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  // Fetch profile to pre-fill preferences
  const { data: meData, isLoading: meLoading } = useQuery<GetMeResponse>({
    queryKey: ['me'],
    queryFn: getMe,
    enabled: visible,
  });

  const [goalType, setGoalType] = useState<GoalTypeT>('GAIN_MUSCLE');
  const [dietPreference, setDietPreference] = useState<DietPreferenceT>('VEG');
  const [foodSourcePreference, setFoodSourcePreference] = useState<'INDIAN' | 'GLOBAL' | 'MIXED'>('MIXED');

  // Pre-fill when meData loads
  useEffect(() => {
    if (meData) {
      if (meData.goal?.goalType) {
        setGoalType(meData.goal.goalType);
      }
      if (meData.profile?.dietPreference) {
        setDietPreference(meData.profile.dietPreference);
      }
    }
  }, [meData]);

  const mutation = useMutation({
    mutationFn: () => {
      const params = { goalType, dietPreference, foodSourcePreference };
      return planId
        ? regenerateDietPlan(planId, params)
        : generateDietPlan(params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeDietPlan'] });
      queryClient.invalidateQueries({ queryKey: ['dietPlanSummary'] });
      queryClient.invalidateQueries({ queryKey: ['dietPlanToday'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
    },
    onError: (err: any) => {
      Alert.alert(
        'Generation Failed',
        err?.response?.data?.message || err?.message || 'Could not generate diet plan. Please try again.',
      );
    },
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + spacing.md }]}>
        {/* Header */}
        <View style={[styles.headerRow, { paddingHorizontal: spacing.lg }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 22, marginRight: spacing.sm }}>✦</Text>
            <Text style={[typo.h2, { color: colors.text }]}>
              {planId ? 'Regenerate Diet Plan' : 'AI Diet Plan'}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[typo.bodySmall, { color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.lg }]}>
            Our AI creates a personalized daily meal plan with exact portions matching your calorie and macro targets.
          </Text>

          {meLoading ? (
            <View style={{ paddingVertical: spacing.xl, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[typo.caption, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                Loading your preferences...
              </Text>
            </View>
          ) : (
            <>
              {/* GOAL TYPE */}
              <Text style={[typo.label, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
                PRIMARY GOAL
              </Text>
              <View style={styles.chipGrid}>
                {GOAL_OPTIONS.map(([key, label]) => {
                  const selected = goalType === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      onPress={() => setGoalType(key)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: selected ? colors.primary : colors.surface,
                          borderColor: selected ? colors.primary : colors.border,
                          borderRadius: borderRadius.md,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          typo.buttonSmall,
                          { color: selected ? colors.textOnPrimary : colors.text },
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* DIET PREFERENCE */}
              <Text
                style={[
                  typo.label,
                  { color: colors.textSecondary, marginTop: spacing.xl, marginBottom: spacing.sm },
                ]}
              >
                DIET PREFERENCE
              </Text>
              <View style={styles.chipRow}>
                {DIET_OPTIONS.map(([key, label]) => {
                  const selected = dietPreference === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      onPress={() => setDietPreference(key)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: selected ? colors.primary : colors.surface,
                          borderColor: selected ? colors.primary : colors.border,
                          borderRadius: borderRadius.md,
                          flex: 1,
                          alignItems: 'center',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          typo.buttonSmall,
                          { color: selected ? colors.textOnPrimary : colors.text },
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {/* FOOD PREFERENCE */}
              <Text
                style={[
                  typo.label,
                  { color: colors.textSecondary, marginTop: spacing.xl, marginBottom: spacing.sm },
                ]}
              >
                FOOD PREFERENCE
              </Text>
              <View style={styles.chipGrid}>
                {FOOD_SOURCE_OPTIONS.map(({ key, label }) => {
                  const selected = foodSourcePreference === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      onPress={() => setFoodSourcePreference(key)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: selected ? colors.primary : colors.surface,
                          borderColor: selected ? colors.primary : colors.border,
                          borderRadius: borderRadius.md,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          typo.buttonSmall,
                          { color: selected ? colors.textOnPrimary : colors.text },
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {/* GENERATE BUTTON */}
          <View style={{ marginTop: spacing.xxl }}>
            <Button
              title={
                mutation.isPending
                  ? 'Generating your plan… (~20s)'
                  : planId
                    ? 'Regenerate Plan ✦'
                    : 'Generate AI Plan ✦'
              }
              onPress={() => mutation.mutate()}
              loading={mutation.isPending}
              disabled={mutation.isPending || meLoading}
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
});
