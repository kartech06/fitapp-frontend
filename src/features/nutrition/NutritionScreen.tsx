/**
 * NutritionScreen — Main tab screen for the Nutrition feature.
 *
 * Layout (top to bottom):
 * 1. Header with "Nutrition" title + date
 * 2. Calorie summary card (consumed vs target with ProgressRing)
 * 3. AI Diet Plan panel (BASIC users, today's plan in AIPanel)
 * 4. "Logged today" section — actual meal_logs grouped by meal type
 * 5. FAB with 3 logging methods
 *
 * DESIGN RULES:
 * - AI diet plan → AIPanel (violet)
 * - Human-logged meals → Card (standard surface)
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Animated,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../shared/hooks/useTheme';
import { useAuthStore } from '../../shared/store/authStore';
import { AIPanel } from '../../shared/components/AIPanel';
import { Card } from '../../shared/components/Card';
import { ProgressRing } from '../../shared/components/ProgressRing';
import { MacroBar } from '../../shared/components/MacroBar';
import { getDashboardToday, type DashboardAggregated } from '../../shared/api/dashboard.api';
import {
  getDietPlanToday,
  deleteMealLog,
  type DietPlanToday,
} from '../../shared/api/nutrition.api';
import { getMealsToday, type MealsTodayResponse, type MealLog } from '../../shared/api/meal.api';
import { formatCalories } from '../../shared/utils/format';
import { MEAL_LABELS, type MealType } from '../../shared/constants';
import { MealLogSheet } from './MealLogSheet';
import { NLLogSheet } from './NLLogSheet';
import { PhotoLogSheet } from './PhotoLogSheet';

const MEAL_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  BREAKFAST: 'sunny-outline',
  LUNCH: 'restaurant-outline',
  DINNER: 'moon-outline',
  SNACK: 'cafe-outline',
  MID_MORNING_SNACK: 'cafe-outline',
  EVENING_SNACK: 'cafe-outline',
};

export function NutritionScreen() {
  const { colors, typography: typo, spacing, borderRadius } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const plan = useAuthStore((s) => s.plan);
  const isBasic = plan === 'BASIC';

  // State — modals
  const [showMealLog, setShowMealLog] = useState(false);
  const [showNLLog, setShowNLLog] = useState(false);
  const [showPhotoLog, setShowPhotoLog] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);

  // Data queries
  const {
    data: dashData,
    isLoading: dashLoading,
    refetch: refetchDash,
    isRefetching,
  } = useQuery<DashboardAggregated>({
    queryKey: ['dashboard'],
    queryFn: getDashboardToday,
  });

  const { data: mealsData, isLoading: mealsLoading, refetch: refetchMeals } = useQuery<MealsTodayResponse>({
    queryKey: ['mealsToday'],
    queryFn: getMealsToday,
  });

  const { data: dietPlan, isLoading: dietLoading } = useQuery<DietPlanToday>({
    queryKey: ['dietPlanToday'],
    queryFn: getDietPlanToday,
    enabled: isBasic,
  });

  // Delete meal mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMealLog(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['mealsToday'] });
      queryClient.invalidateQueries({ queryKey: ['nutritionToday'] });
    },
  });

  const handleDeleteMeal = useCallback(
    (id: string, name: string) => {
      Alert.alert('Delete Meal', `Remove "${name}" from today's log?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(id),
        },
      ]);
    },
    [deleteMutation],
  );

  const handleRefresh = useCallback(() => {
    refetchDash();
    refetchMeals();
  }, [refetchDash, refetchMeals]);

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const dashboard = dashData?.dashboard;
  const isLoading = dashLoading || mealsLoading;

  const mealGroups = (
    [
      { type: 'BREAKFAST' as const, label: 'Breakfast', meals: mealsData?.meals?.BREAKFAST || [] },
      { type: 'LUNCH' as const, label: 'Lunch', meals: mealsData?.meals?.LUNCH || [] },
      { type: 'DINNER' as const, label: 'Dinner', meals: mealsData?.meals?.DINNER || [] },
      { type: 'SNACK' as const, label: 'Snack', meals: mealsData?.meals?.SNACK || [] },
      { type: 'EVENING_SNACK' as const, label: 'Evening Snack', meals: mealsData?.meals?.EVENING_SNACK || [] },
    ] as { type: MealType; label: string; meals: MealLog[] }[]
  ).filter((g) => g.meals.length > 0);

  // Skeleton placeholder
  const Skeleton = ({ width, height }: { width: number | string; height: number }) => (
    <View
      style={{
        width: width as number,
        height,
        backgroundColor: colors.surface2,
        borderRadius: borderRadius.sm,
        marginBottom: spacing.sm,
      }}
    />
  );

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
          <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <View style={[styles.header, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
          <View>
            <Text style={[typo.h2, { color: colors.text }]}>Nutrition</Text>
            <Text style={[typo.caption, { color: colors.textSecondary, marginTop: 2 }]}>{todayStr}</Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('DietPlan' as never)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: `${colors.primary}18`,
              paddingHorizontal: spacing.md,
              paddingVertical: 8,
              borderRadius: borderRadius.full,
              borderWidth: 1,
              borderColor: colors.primary,
            }}
          >
            <Ionicons name="sparkles" size={16} color={colors.primary} style={{ marginRight: 4 }} />
            <Text style={[typo.caption, { color: colors.primary, fontWeight: '700' }]}>AI Diet Plan</Text>
          </TouchableOpacity>
        </View>

        {/* ─── Calorie Summary Card ─── */}
        {isLoading ? (
          <Card style={{ marginTop: spacing.md }}>
            <Skeleton width="60%" height={20} />
            <Skeleton width="40%" height={14} />
            <Skeleton width="100%" height={8} />
          </Card>
        ) : dashboard ? (
          <Card style={{ marginTop: spacing.md }}>
            <View style={styles.calorieRow}>
              <View style={{ alignItems: 'center' }}>
                <ProgressRing
                  consumed={dashboard.calories.consumed}
                  goal={dashboard.calories.goal}
                  size={90}
                  strokeWidth={8}
                />
              </View>
              <View style={{ flex: 1, marginLeft: spacing.lg }}>
                <Text style={[typo.h3, { color: colors.text }]}>Calories</Text>
                <Text style={[typo.bodySmall, { color: colors.textSecondary, marginTop: 2 }]}>
                  {formatCalories(dashboard.calories.consumed)} of {formatCalories(dashboard.calories.goal)} kcal
                </Text>
                <View style={{ marginTop: spacing.sm }}>
                  <MacroBar
                    protein={{ consumed: dashboard.macros.protein.consumed, goal: dashboard.macros.protein.goal }}
                    carbs={{ consumed: dashboard.macros.carbs.consumed, goal: dashboard.macros.carbs.goal }}
                    fat={{ consumed: dashboard.macros.fat.consumed, goal: dashboard.macros.fat.goal }}
                  />
                </View>
              </View>
            </View>
          </Card>
        ) : null}

        {/* ─── AI Diet Plan (BASIC only) ─── */}
        {isBasic && (
          <View style={{ marginTop: spacing.md }}>
            {dietLoading ? (
              <View
                style={{
                  backgroundColor: colors.aiBackground,
                  borderColor: colors.aiBorder,
                  borderWidth: 1,
                  borderRadius: borderRadius.xl,
                  padding: spacing.md,
                }}
              >
                <Skeleton width="50%" height={16} />
                <Skeleton width="80%" height={14} />
                <Skeleton width="70%" height={14} />
              </View>
            ) : dietPlan ? (
              <AIPanel label="AI Diet Plan">
                <Text style={[typo.h3, { color: colors.aiText, marginBottom: spacing.sm }]}>
                  Today's Plan • {formatCalories(dietPlan.totalCalories)} kcal
                </Text>
                {dietPlan.meals.map((meal, idx) => (
                  <View key={idx} style={{ marginBottom: idx < dietPlan.meals.length - 1 ? spacing.sm : 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <Ionicons
                        name={MEAL_ICONS[meal.mealType] || 'restaurant-outline'}
                        size={16}
                        color={colors.secondary}
                        style={{ marginRight: spacing.xs }}
                      />
                      <Text style={[typo.label, { color: colors.aiText }]}>
                        {MEAL_LABELS[meal.mealType] || meal.mealType}
                      </Text>
                      <Text style={[typo.caption, { color: colors.secondary, marginLeft: 'auto' }]}>
                        {formatCalories(meal.totalCalories)} kcal
                      </Text>
                    </View>
                    {meal.foods.map((food, fi) => (
                      <Text key={fi} style={[typo.bodySmall, { color: colors.aiText, marginLeft: spacing.lg, opacity: 0.8 }]}>
                        {food.quantity} {food.name} — {formatCalories(food.calories)} kcal
                      </Text>
                    ))}
                  </View>
                ))}
                <TouchableOpacity
                  style={{
                    marginTop: spacing.md,
                    paddingTop: spacing.sm,
                    alignItems: 'center',
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: colors.aiBorder,
                  }}
                  onPress={() => navigation.navigate('DietPlan' as never)}
                >
                  <Text style={[typo.buttonSmall, { color: colors.primary, fontWeight: '700' }]}>
                    View & Manage Full AI Diet Plan →
                  </Text>
                </TouchableOpacity>
              </AIPanel>
            ) : (
              <AIPanel label="AI Diet Plan">
                <Text style={[typo.bodySmall, { color: colors.aiText, marginBottom: spacing.md }]}>
                  You don't have an active AI diet plan yet. Generate one to get personalized macro-balanced meal schedules.
                </Text>
                <TouchableOpacity
                  style={{
                    backgroundColor: colors.primary,
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.md,
                    borderRadius: borderRadius.md,
                    alignItems: 'center',
                  }}
                  onPress={() => navigation.navigate('DietPlan' as never)}
                >
                  <Text style={[typo.buttonSmall, { color: colors.textOnPrimary, fontWeight: '700' }]}>
                    Generate AI Diet Plan ✦
                  </Text>
                </TouchableOpacity>
              </AIPanel>
            )}
          </View>
        )}

        {/* ─── Logged Today ─── */}
        <View style={{ marginTop: spacing.lg }}>
          <Text style={[typo.h3, { color: colors.text, marginBottom: spacing.sm }]}>
            Logged Today
          </Text>

          {isLoading ? (
            <>
              <Skeleton width="100%" height={60} />
              <Skeleton width="100%" height={60} />
            </>
          ) : mealGroups.length === 0 ? (
            <Card>
              <View style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
                <Ionicons name="restaurant-outline" size={36} color={colors.textDim} />
                <Text
                  style={[
                    typo.body,
                    { color: colors.textDim, marginTop: spacing.sm, textAlign: 'center' },
                  ]}
                >
                  No meals logged yet today.{'\n'}
                  Tap the + button below to get started!
                </Text>
              </View>
            </Card>
          ) : (
            mealGroups.map((group) => {
              const groupCalories = Math.round(group.meals.reduce((s, m) => s + m.calories, 0));
              return (
                <Card key={group.type} style={{ marginBottom: spacing.sm }}>
                  <View style={styles.mealGroupHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons
                        name={MEAL_ICONS[group.type] || 'restaurant-outline'}
                        size={18}
                        color={colors.primary}
                        style={{ marginRight: spacing.sm }}
                      />
                      <Text style={[typo.label, { color: colors.text }]}>{group.label}</Text>
                    </View>
                    <Text style={[typo.label, { color: colors.primary }]}>{formatCalories(groupCalories)} kcal</Text>
                  </View>

                  {group.meals.map((meal) => (
                    <View key={meal.id} style={[styles.mealItem, { borderTopColor: colors.border }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[typo.body, { color: colors.text }]}>{meal.name}</Text>
                        <Text style={[typo.caption, { color: colors.textSecondary }]}>
                          {formatCalories(meal.calories)} kcal • P: {meal.proteinG}g  C: {meal.carbsG}g  F: {meal.fatG}g
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleDeleteMeal(meal.id, meal.name)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </Card>
              );
            })
          )}
        </View>

        {/* ─── Macro Breakdown Summary ─── */}
        {mealsData && mealsData.totals && mealsData.totals.calories > 0 && (
          <Card style={{ marginTop: spacing.sm }}>
            <Text style={[typo.label, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
              TODAY'S NUTRITION TOTALS
            </Text>
            <View style={styles.macroSummaryRow}>
              <View style={styles.macroBlock}>
                <Text style={[typo.number, { color: colors.primary, fontSize: 22 }]}>
                  {formatCalories(mealsData.totals.calories)}
                </Text>
                <Text style={[typo.caption, { color: colors.textSecondary }]}>kcal</Text>
              </View>
              <View style={[styles.macroDivider, { backgroundColor: colors.border }]} />
              <View style={styles.macroBlock}>
                <Text style={[typo.h3, { color: '#EF4444' }]}>{mealsData.totals.proteinG}g</Text>
                <Text style={[typo.caption, { color: colors.textSecondary }]}>Protein</Text>
              </View>
              <View style={[styles.macroDivider, { backgroundColor: colors.border }]} />
              <View style={styles.macroBlock}>
                <Text style={[typo.h3, { color: '#3B82F6' }]}>{mealsData.totals.carbsG}g</Text>
                <Text style={[typo.caption, { color: colors.textSecondary }]}>Carbs</Text>
              </View>
              <View style={[styles.macroDivider, { backgroundColor: colors.border }]} />
              <View style={styles.macroBlock}>
                <Text style={[typo.h3, { color: '#F59E0B' }]}>{mealsData.totals.fatG}g</Text>
                <Text style={[typo.caption, { color: colors.textSecondary }]}>Fat</Text>
              </View>
            </View>
          </Card>
        )}
      </ScrollView>

      {/* ─── FAB ─── */}
      <View style={[styles.fabContainer, { bottom: insets.bottom + spacing.md, right: spacing.md }]}>
        {fabOpen && (
          <View style={[styles.fabMenu, { marginBottom: spacing.sm }]}>
            {/* Manual Log — available to all */}
            <TouchableOpacity
              style={[
                styles.fabOption,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: borderRadius.lg,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.ms,
                  marginBottom: spacing.sm,
                },
              ]}
              onPress={() => {
                setFabOpen(false);
                setShowMealLog(true);
              }}
            >
              <View style={[styles.fabIconCircle, { backgroundColor: colors.primary + '22' }]}>
                <Text style={{ fontSize: 16 }}>✏️</Text>
              </View>
              <View style={{ marginLeft: spacing.sm }}>
                <Text style={[typo.buttonSmall, { color: colors.text }]}>Log Manually</Text>
                <Text style={[typo.caption, { color: colors.textSecondary }]}>Search & add foods</Text>
              </View>
            </TouchableOpacity>

            {/* NL Log — BASIC only */}
            <TouchableOpacity
              style={[
                styles.fabOption,
                {
                  backgroundColor: isBasic ? colors.surface : colors.surface2,
                  borderColor: colors.border,
                  borderRadius: borderRadius.lg,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.ms,
                  marginBottom: spacing.sm,
                  opacity: isBasic ? 1 : 0.6,
                },
              ]}
              onPress={() => {
                if (!isBasic) {
                  Alert.alert('BASIC Plan Required', 'Natural language logging is available for BASIC subscribers.');
                  return;
                }
                setFabOpen(false);
                setShowNLLog(true);
              }}
            >
              <View style={[styles.fabIconCircle, { backgroundColor: colors.secondary + '22' }]}>
                <Text style={{ fontSize: 16 }}>💬</Text>
              </View>
              <View style={{ marginLeft: spacing.sm, flex: 1 }}>
                <Text style={[typo.buttonSmall, { color: colors.text }]}>Describe Meal</Text>
                <Text style={[typo.caption, { color: colors.textSecondary }]}>Type in natural language</Text>
              </View>
              {!isBasic && (
                <View style={[styles.upgradeBadge, { backgroundColor: colors.secondary, borderRadius: borderRadius.sm }]}>
                  <Text style={[typo.caption, { color: '#FFF', fontSize: 9, fontWeight: '700' }]}>BASIC</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Photo Scan — BASIC (5 free for FREE) */}
            <TouchableOpacity
              style={[
                styles.fabOption,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: borderRadius.lg,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.ms,
                },
              ]}
              onPress={() => {
                setFabOpen(false);
                setShowPhotoLog(true);
              }}
            >
              <View style={[styles.fabIconCircle, { backgroundColor: colors.error + '22' }]}>
                <Text style={{ fontSize: 16 }}>📷</Text>
              </View>
              <View style={{ marginLeft: spacing.sm, flex: 1 }}>
                <Text style={[typo.buttonSmall, { color: colors.text }]}>Scan Food</Text>
                <Text style={[typo.caption, { color: colors.textSecondary }]}>
                  {isBasic ? 'Unlimited scans' : '5 free scans'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* FAB Button */}
        <TouchableOpacity
          onPress={() => setFabOpen(!fabOpen)}
          activeOpacity={0.85}
          style={[
            styles.fab,
            {
              backgroundColor: fabOpen ? colors.error : colors.primary,
              borderRadius: 28,
              width: 56,
              height: 56,
            },
          ]}
        >
          <Ionicons
            name={fabOpen ? 'close' : 'add'}
            size={28}
            color={fabOpen ? '#FFF' : colors.textOnPrimary}
          />
        </TouchableOpacity>
      </View>

      {/* ─── Modals ─── */}
      <MealLogSheet visible={showMealLog} onClose={() => setShowMealLog(false)} />
      <NLLogSheet visible={showNLLog} onClose={() => setShowNLLog(false)} />
      <PhotoLogSheet visible={showPhotoLog} onClose={() => setShowPhotoLog(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  calorieRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mealGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mealItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  macroSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  macroBlock: {
    alignItems: 'center',
    flex: 1,
  },
  macroDivider: {
    width: 1,
    height: 30,
  },
  fabContainer: {
    position: 'absolute',
    alignItems: 'flex-end',
  },
  fabMenu: {
    alignItems: 'stretch',
    width: 220,
  },
  fabOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    // shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  fabIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  fab: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
});
