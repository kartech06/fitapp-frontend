/**
 * DietPlanScreen — Standalone screen displaying the active AI Diet Plan.
 *
 * Requirements:
 * - GET /diet-plans/active
 * - Show today's planned meals in AIPanel sections (one per meal type)
 * - Each food item: name, quantity, calories
 * - "Regenerate plan" button → POST /diet-plans/generate with stored preferences
 * - If no active plan: "Generate your AI diet plan" CTA (BASIC only)
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../shared/hooks/useTheme';
import { useAuthStore } from '../../shared/store/authStore';
import { AIPanel } from '../../shared/components/AIPanel';
import { Card } from '../../shared/components/Card';
import { Button } from '../../shared/components/Button';
import {
  getActiveDietPlan,
  abandonDietPlan,
  type ActiveDietPlan,
} from '../../shared/api/nutrition.api';
import { formatCalories } from '../../shared/utils/format';
import { MEAL_LABELS, type MealType } from '../../shared/constants';
import { MacroSummaryCard } from './MacroSummaryCard';
import { DietGenerateSheet } from './DietGenerateSheet';

const MEAL_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  BREAKFAST: 'sunny-outline',
  LUNCH: 'restaurant-outline',
  DINNER: 'moon-outline',
  SNACK: 'cafe-outline',
  MID_MORNING_SNACK: 'cafe-outline',
  EVENING_SNACK: 'cafe-outline',
};

export function DietPlanScreen() {
  const { colors, typography: typo, spacing, borderRadius } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const plan = useAuthStore((s) => s.plan);
  const isBasic = plan === 'BASIC';

  const [showGenerateSheet, setShowGenerateSheet] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const {
    data: activePlan,
    isLoading: planLoading,
    refetch: refetchPlan,
    isRefetching,
    error: planError,
  } = useQuery<ActiveDietPlan>({
    queryKey: ['activeDietPlan'],
    queryFn: getActiveDietPlan,
    retry: false,
  });

  const abandonMutation = useMutation({
    mutationFn: () => abandonDietPlan(activePlan!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeDietPlan'] });
      queryClient.invalidateQueries({ queryKey: ['dietPlanSummary'] });
      queryClient.invalidateQueries({ queryKey: ['dietPlanToday'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const handleAbandon = useCallback(() => {
    Alert.alert(
      'Abandon Diet Plan',
      'Are you sure you want to stop following this diet plan?',
      [
        { text: 'Keep Plan', style: 'cancel' },
        {
          text: 'Abandon',
          style: 'destructive',
          onPress: () => abandonMutation.mutate(),
        },
      ],
    );
  }, [abandonMutation]);

  const hasNoPlan = !activePlan || (planError as any)?.response?.status === 404 || (planError as any)?.error_code === 'NO_ACTIVE_DIET_PLAN';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + spacing.md,
        },
      ]}
    >
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetchPlan} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <View style={[styles.headerRow, { marginBottom: spacing.lg }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {navigation.canGoBack() && (
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{ marginRight: spacing.sm }}
              >
                <Ionicons name="arrow-back" size={24} color={colors.text} />
              </TouchableOpacity>
            )}
            <Text style={[typo.h2, { color: colors.text }]}>AI Diet Plan</Text>
          </View>
          {activePlan && (
            <TouchableOpacity onPress={handleAbandon} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="ellipsis-horizontal" size={24} color={colors.textDim} />
            </TouchableOpacity>
          )}
        </View>

        {/* Loading State */}
        {planLoading && (
          <View style={{ gap: spacing.md }}>
            <View style={{ height: 160, backgroundColor: colors.surface2, borderRadius: borderRadius.lg }} />
            <View style={{ height: 120, backgroundColor: colors.aiBackground, borderRadius: borderRadius.xl }} />
            <View style={{ height: 120, backgroundColor: colors.aiBackground, borderRadius: borderRadius.xl }} />
          </View>
        )}

        {/* No Active Plan State */}
        {hasNoPlan && !planLoading && (
          <View>
            <View
              style={[
                styles.emptyState,
                {
                  backgroundColor: colors.surface,
                  borderRadius: borderRadius.lg,
                  borderColor: colors.border,
                  padding: spacing.xl,
                },
              ]}
            >
              <View style={[styles.emptyIconCircle, { backgroundColor: colors.surface2 }]}>
                <Ionicons name="leaf-outline" size={48} color={colors.textDim} />
              </View>

              <Text style={[typo.h3, { color: colors.text, textAlign: 'center', marginTop: spacing.lg }]}>
                No active diet plan
              </Text>

              <Text
                style={[
                  typo.body,
                  {
                    color: colors.textDim,
                    textAlign: 'center',
                    marginTop: spacing.sm,
                    marginBottom: spacing.xl,
                  },
                ]}
              >
                {isBasic
                  ? 'Generate a personalized AI diet plan customized to your goals, preferences, and calorie targets.'
                  : 'Upgrade to Basic to unlock AI-generated meal plans with precise macro balancing.'}
              </Text>

              {isBasic ? (
                <View style={{ gap: 12, width: '100%' }}>
                  <Button
                    title="Generate AI Diet Plan ✦"
                    onPress={() => {
                      setIsRegenerating(false);
                      setShowGenerateSheet(true);
                    }}
                  />
                </View>
              ) : (
                <View style={{ gap: 12, width: '100%' }}>
                  <Button
                    title="Upgrade to Basic"
                    onPress={() => {
                      Alert.alert('Coming Soon', 'In-app purchases coming in a future update.');
                    }}
                  />
                </View>
              )}
            </View>
          </View>
        )}

        {/* Active Plan Display */}
        {activePlan && !planLoading && (
          <View>
            {/* Macro Summary Card */}
            <MacroSummaryCard />

            {/* Template & Target Badges */}
            <View style={[styles.planMetaRow, { marginBottom: spacing.md }]}>
              <View style={[styles.metaChip, { backgroundColor: colors.surface2, borderRadius: borderRadius.full }]}>
                <Ionicons name="flame-outline" size={14} color={colors.primary} style={{ marginRight: 4 }} />
                <Text style={[typo.caption, { color: colors.text }]}>{formatCalories(activePlan.targetCalories)} kcal goal</Text>
              </View>
              <View style={[styles.metaChip, { backgroundColor: colors.surface2, borderRadius: borderRadius.full }]}>
                <Ionicons name="restaurant-outline" size={14} color={colors.secondary} style={{ marginRight: 4 }} />
                <Text style={[typo.caption, { color: colors.text }]}>{activePlan.template?.name || 'Custom Plan'}</Text>
              </View>
              <View style={[styles.metaChip, { backgroundColor: colors.surface2, borderRadius: borderRadius.full }]}>
                <Ionicons name="earth-outline" size={14} color={colors.textSecondary} style={{ marginRight: 4 }} />
                <Text style={[typo.caption, { color: colors.text }]}>
                  {activePlan.foodSourcePref === 'INDIAN' ? '🇮🇳 Indian' : activePlan.foodSourcePref === 'GLOBAL' ? '🌍 Global' : '🔀 Mixed'}
                </Text>
              </View>
            </View>

            {/* Meals List (AIPanel sections) */}
            {(activePlan.meals || []).map((meal) => {
              let mealCal = 0;
              const foodsList = (meal.foods || []).map((f) => {
                const scale = (f.quantityGrams || 100) / 100;
                const cal = Math.round((f.food.macros?.caloriesKcal || 0) * scale);
                mealCal += cal;
                return {
                  id: f.id,
                  name: f.food.name,
                  quantity: `${f.quantityGrams}g`,
                  calories: cal,
                };
              });

              const iconName = MEAL_ICONS[meal.mealType] || 'restaurant-outline';
              const mealLabel = MEAL_LABELS[meal.mealType] || meal.mealType;

              return (
                <View key={meal.id || meal.mealType} style={{ marginBottom: spacing.md }}>
                  <AIPanel label={`Planned ${mealLabel}`}>
                    <View style={styles.mealHeaderRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name={iconName} size={18} color={colors.secondary} style={{ marginRight: spacing.xs }} />
                        <Text style={[typo.h3, { color: colors.aiText }]}>{mealLabel}</Text>
                      </View>
                      <Text style={[typo.bodySmall, { color: colors.secondary, fontWeight: '700' }]}>
                        ~{formatCalories(mealCal)} kcal
                      </Text>
                    </View>

                    <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
                      {foodsList.map((food, idx) => (
                        <View
                          key={food.id || idx}
                          style={[
                            styles.foodItemRow,
                            {
                              borderTopColor: idx > 0 ? colors.aiBorder : 'transparent',
                              borderTopWidth: idx > 0 ? StyleSheet.hairlineWidth : 0,
                              paddingTop: idx > 0 ? spacing.xs : 0,
                            },
                          ]}
                        >
                          <Text style={[typo.body, { color: colors.aiText, flex: 1 }]}>{food.name}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                            <Text style={[typo.bodySmall, { color: colors.aiText, opacity: 0.8 }]}>{food.quantity}</Text>
                            <Text style={[typo.bodySmall, { color: colors.secondary, fontWeight: '600', minWidth: 60, textAlign: 'right' }]}>
                              {formatCalories(food.calories)} kcal
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </AIPanel>
                </View>
              );
            })}

            {/* Regenerate Plan Button */}
            <View style={{ marginTop: spacing.lg, marginBottom: spacing.xl }}>
              <Button
                title="Regenerate Plan ✦"
                variant="outline"
                onPress={() => {
                  setIsRegenerating(true);
                  setShowGenerateSheet(true);
                }}
              />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Generate / Regenerate Sheet */}
      <DietGenerateSheet
        visible={showGenerateSheet}
        onClose={() => setShowGenerateSheet(false)}
        planId={isRegenerating && activePlan ? activePlan.id : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emptyState: {
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  mealHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  foodItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
