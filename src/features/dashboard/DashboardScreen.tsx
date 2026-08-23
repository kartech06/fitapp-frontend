import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Platform,
  ToastAndroid,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../shared/hooks/useTheme';
import { usePlan } from '../../shared/hooks/usePlan';
import { useAuthStore } from '../../shared/store/authStore';
import { ProgressRing } from '../../shared/components/ProgressRing';
import { MacroBar } from '../../shared/components/MacroBar';
import { Card } from '../../shared/components/Card';
import { Badge } from '../../shared/components/Badge';
import { AIPanel } from '../../shared/components/AIPanel';
import { Button } from '../../shared/components/Button';
import { getDashboardToday, type DashboardAggregated } from '../../shared/api/dashboard.api';
import { getTodayWorkout } from '../../shared/api/workout.api';
import { logWater } from '../../shared/api/water.api';
import { formatCalories } from '../../shared/utils/format';
import type { AppTabParamList, RootStackParamList } from '../../shared/navigation/types';
import { QuickLogWorkoutSheet } from '../workout/QuickLogWorkoutSheet';
import { MealActionSheet } from '../nutrition/MealActionSheet';

type DashboardNav = CompositeNavigationProp<
  BottomTabNavigationProp<AppTabParamList, 'Today'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export function DashboardScreen() {
  const { colors, typography: typo, spacing, borderRadius } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<DashboardNav>();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const { isBasic, isFree } = usePlan();

  const [showQuickLog, setShowQuickLog] = useState(false);
  const [showMealAction, setShowMealAction] = useState(false);

  // Fetch dashboard + meals + workouts for today
  const { data, isLoading, refetch, isRefetching } = useQuery<DashboardAggregated>({
    queryKey: ['dashboard'],
    queryFn: getDashboardToday,
  });

  // Fetch AI workout if basic
  const { data: todayWorkout, isLoading: isLoadingWorkout, refetch: refetchWorkout } = useQuery({
    queryKey: ['todayWorkout'],
    queryFn: getTodayWorkout,
    enabled: isBasic,
  });

  // Log water mutation
  const waterMutation = useMutation({
    mutationFn: () => logWater({ amountMl: 250 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      if (Platform.OS === 'android') {
        ToastAndroid.show('Logged 250ml of water 💧', ToastAndroid.SHORT);
      }
    },
  });

  const handleRefresh = () => {
    refetch();
    if (isBasic) {
      refetchWorkout();
    }
  };

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  // Render skeleton while loading
  if (isLoading || !data || (isBasic && isLoadingWorkout)) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={[styles.skeletonHeader, { backgroundColor: colors.surface2, borderRadius: borderRadius.md }]} />
        <View style={[styles.skeletonHero, { backgroundColor: colors.surface, borderRadius: borderRadius.lg }]} />
        <View style={[styles.skeletonRow, { backgroundColor: colors.surface2, borderRadius: borderRadius.md }]} />
        <View style={[styles.skeletonBlock, { backgroundColor: colors.surface, borderRadius: borderRadius.lg }]} />
      </View>
    );
  }

  const { dashboard, meals, workouts } = data;
  const hasLoggedAnything =
    meals.totals.calories > 0 ||
    workouts.count > 0 ||
    dashboard.water.consumed_ml > 0 ||
    dashboard.weight.latest !== null; // technically weight today

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing.md,
          paddingBottom: insets.bottom + 100, // padding for tabs + FABs
          paddingHorizontal: spacing.lg,
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* HEADER */}
        <View style={[styles.headerRow, { marginBottom: spacing.lg }]}>
          <View>
            <Text style={[typo.h2, { color: colors.text }]}>Hey {user?.name}</Text>
            <Text style={[typo.body, { color: colors.textDim }]}>{todayStr}</Text>
          </View>
          {dashboard.streak > 0 && (
            <Badge
              variant={{ type: 'streak', count: dashboard.streak }}
            />
          )}
        </View>

        {/* HERO CALORIE CARD */}
        <Card style={{ marginBottom: spacing.xl }}>
          <View style={styles.heroContent}>
            <View style={styles.heroLeft}>
              <Text style={[typo.h3, { color: colors.text, marginBottom: spacing.xs }]}>
                Calories
              </Text>
              <Text style={[typo.caption, { color: colors.textDim, marginBottom: spacing.md }]}>
                {formatCalories(dashboard.calories.consumed)} of {formatCalories(dashboard.calories.goal)} kcal
              </Text>

              {dashboard.calories.burned > 0 && (
                <TouchableOpacity onPress={() => Alert.alert('Estimated Burn', dashboard.calories.burnedDisclaimer)}>
                  <Text style={[typo.caption, { color: colors.primary, marginBottom: spacing.md }]}>
                    🔥 {formatCalories(dashboard.calories.burned)} kcal burned (est.)
                  </Text>
                </TouchableOpacity>
              )}

              {/* Macro Bar */}
              <View style={{ width: '100%' }}>
                <MacroBar
                  protein={{ consumed: dashboard.macros.protein.consumed, goal: dashboard.macros.protein.goal }}
                  carbs={{ consumed: dashboard.macros.carbs.consumed, goal: dashboard.macros.carbs.goal }}
                  fat={{ consumed: dashboard.macros.fat.consumed, goal: dashboard.macros.fat.goal }}
                  height={8}
                />
              </View>
            </View>
            <View style={styles.heroRight}>
              <ProgressRing
                consumed={dashboard.calories.consumed}
                goal={dashboard.calories.goal}
                size={120}
                strokeWidth={10}
              />
            </View>
          </View>
        </Card>

        {/* AI WORKOUT PANEL / UPSELL */}
        {isFree ? (
          <View
            style={[
              styles.upsell,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: borderRadius.lg,
                padding: spacing.md,
                marginBottom: spacing.xl,
              },
            ]}
          >
            <Ionicons name="sparkles" size={20} color={colors.secondary} />
            <Text
              style={[
                typo.bodySmall,
                { color: colors.textDim, marginLeft: spacing.sm, flex: 1 },
              ]}
            >
              Upgrade to Basic to unlock personalized AI workout plans, diet plans, and more.
            </Text>
          </View>
        ) : isBasic && todayWorkout ? (
          <View style={{ marginBottom: spacing.xl }}>
            {/* Subtle Missed Days Hint */}
            {!todayWorkout.overrideDay && (todayWorkout.missedDays?.length ?? 0) > 0 && (
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: `${colors.error}10`, padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.md }}
                onPress={() => navigation.navigate('Workout')}
                activeOpacity={0.7}
              >
                <Ionicons name="alert-circle" size={20} color={colors.error} />
                <Text style={[typo.bodySmall, { color: colors.text, marginLeft: spacing.sm, flex: 1 }]}>
                  You have missed workouts to recover. Tap to view.
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.error} />
              </TouchableOpacity>
            )}

            {todayWorkout.overrideDay ? (
              <AIPanel label="Choose Your Workout">
                {/* Recovering Card */}
                <Card style={{ marginBottom: spacing.sm, borderColor: colors.primary }}>
                  <Text style={[typo.caption, { color: colors.primary, fontWeight: 'bold', marginBottom: 4 }]}>RECOVERING MISSED</Text>
                  <Text style={[typo.h3, { color: colors.text, marginBottom: spacing.sm }]}>{todayWorkout.overrideDay.dayName}</Text>
                  <Button
                    title={todayWorkout.overrideDay.isCompletedToday ? "Review Workout" : "Start Workout 💪"}
                    variant={todayWorkout.overrideDay.isCompletedToday ? "outline" : "primary"}
                    onPress={() => {
                      const plannedExercises = todayWorkout.overrideDay!.exercises.map((ex) => ({
                        planExerciseId: ex.id,
                        exerciseId: ex.exerciseId || ex.id,
                        name: ex.exercise.name,
                        actualExerciseName: ex.actualExerciseName,
                        sets: ex.sets,
                        reps: ex.reps,
                        weightKg: ex.targetWeightKg,
                        completedToday: ex.completedToday,
                        primaryMuscles: ex.exercise.primaryMuscles,
                      }));
                      navigation.navigate('WorkoutLog', { plannedExercises });
                    }}
                  />
                </Card>

                {/* Scheduled Card */}
                <Card>
                  <Text style={[typo.caption, { color: colors.textDim, fontWeight: 'bold', marginBottom: 4 }]}>SCHEDULED TODAY</Text>
                  <Text style={[typo.h3, { color: colors.text, marginBottom: spacing.sm }]}>
                    {todayWorkout.isRestDay ? "Rest Day" : todayWorkout.dayName}
                  </Text>
                  {todayWorkout.isRestDay ? (
                    <Text style={[typo.body, { color: colors.textDim }]}>Recovery is part of the plan.</Text>
                  ) : (
                    <Button
                      title={todayWorkout.isCompletedToday ? "Review Workout" : "Start Workout"}
                      variant={todayWorkout.isCompletedToday ? "outline" : "outline"}
                      onPress={() => {
                        const plannedExercises = todayWorkout.exercises?.map((ex) => ({
                          planExerciseId: ex.id,
                          exerciseId: ex.exerciseId || ex.id,
                          name: ex.exercise.name,
                          actualExerciseName: ex.actualExerciseName,
                          sets: ex.sets,
                          reps: ex.reps,
                          weightKg: ex.targetWeightKg,
                          completedToday: ex.completedToday,
                          primaryMuscles: ex.exercise.primaryMuscles,
                        })) || [];
                        navigation.navigate('WorkoutLog', { plannedExercises });
                      }}
                    />
                  )}
                </Card>
              </AIPanel>
            ) : (
              <AIPanel label="Today's Plan">
                {todayWorkout.isRestDay ? (
                  <Text style={[typo.body, { color: colors.text }]}>Today is a rest day. Take it easy!</Text>
                ) : (
                  <View>
                    {todayWorkout.isCompletedToday ? (
                      <>
                        <Text style={[typo.h3, { color: colors.success || colors.primary, marginBottom: spacing.xs }]}>
                          ✅ Workout Complete!
                        </Text>
                        <Text style={[typo.body, { color: colors.textDim, marginBottom: spacing.md }]}>
                          {todayWorkout.dayName} — {todayWorkout.exercises?.length || 0} exercises
                        </Text>
                      </>
                    ) : (
                      <>
                        <Text style={[typo.h3, { color: colors.text }]}>
                          {todayWorkout.dayName}
                        </Text>
                        <Text style={[typo.body, { color: colors.textDim, marginBottom: spacing.md }]}>
                          {todayWorkout.exercises?.length || 0} exercises planned
                        </Text>
                      </>
                    )}
                    <Button
                      title={todayWorkout.isCompletedToday ? "Review Workout" : "View Full Workout"}
                      variant={todayWorkout.isCompletedToday ? "outline" : "primary"}
                      onPress={() => {
                        const plannedExercises = todayWorkout.exercises?.map((ex) => ({
                          planExerciseId: ex.id,
                          exerciseId: ex.exerciseId || ex.id,
                          name: ex.exercise.name,
                          actualExerciseName: ex.actualExerciseName,
                          sets: ex.sets,
                          reps: ex.reps,
                          weightKg: ex.targetWeightKg,
                          completedToday: ex.completedToday,
                          primaryMuscles: ex.exercise.primaryMuscles,
                        })) || [];
                        navigation.navigate('WorkoutLog', { plannedExercises });
                      }}
                    />
                  </View>
                )}
              </AIPanel>
            )}
          </View>
        ) : null}

        {/* LOGGED TODAY LEDGER */}
        <Text style={[typo.h3, { color: colors.text, marginBottom: spacing.md }]}>Logged Today</Text>

        {!hasLoggedAnything ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface2, borderRadius: borderRadius.lg, padding: spacing.lg }]}>
            <Ionicons name="sunny" size={32} color={colors.textDim} style={{ marginBottom: spacing.sm }} />
            <Text style={[typo.body, { color: colors.textDim, textAlign: 'center' }]}>
              Start your day — log your first meal or workout
            </Text>
          </View>
        ) : (
          <View>
            {/* Water */}
            <Card style={{ padding: 0, marginBottom: spacing.sm }}>
              <View style={[styles.ledgerRow, { borderBottomWidth: 0, paddingHorizontal: spacing.md }]}>
                <View style={styles.ledgerIconContainer}>
                  <Ionicons name="water" size={24} color="#0ea5e9" />
                </View>
                <View style={styles.ledgerContent}>
                  <Text style={[typo.body, { color: colors.text }]}>Water</Text>
                  <Text style={[typo.caption, { color: colors.textDim }]}>
                    {dashboard.water.consumed_ml} / {dashboard.water.goal_ml} ml
                  </Text>
                  {/* Progress bar */}
                  <View style={[styles.waterBarBg, { backgroundColor: colors.surface2 }]}>
                    <View
                      style={[
                        styles.waterBarFill,
                        {
                          backgroundColor: '#0ea5e9',
                          width: `${Math.min(100, (dashboard.water.consumed_ml / dashboard.water.goal_ml) * 100)}%`,
                        },
                      ]}
                    />
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => waterMutation.mutate()}
                  style={[styles.waterAddBtn, { backgroundColor: colors.surface2 }]}
                >
                  <Ionicons name="add" size={20} color={colors.text} />
                </TouchableOpacity>
              </View>
            </Card>

            {/* Meals */}
            {Object.entries(meals.meals).map(([mealType, mealList]) => {
              if (!mealList || mealList.length === 0) return null;
              
              const groupCalories = Math.round(mealList.reduce((sum, m) => sum + m.calories, 0));
              const label = mealType.replace('_', ' ');

              return (
                <Card key={mealType} style={{ padding: 0, marginBottom: spacing.sm }}>
                  <TouchableOpacity
                    style={[styles.ledgerRow, { borderBottomWidth: 0, paddingHorizontal: spacing.md }]}
                    onPress={() => navigation.navigate('Nutrition')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.ledgerIconContainer}>
                      <Ionicons name="restaurant" size={24} color={colors.primary} />
                    </View>
                    <View style={styles.ledgerContent}>
                      <Text style={[typo.body, { color: colors.text, textTransform: 'capitalize' }]}>{label}</Text>
                      <Text style={[typo.caption, { color: colors.textDim }]} numberOfLines={1}>
                        {mealList.map(m => m.name).join(', ')}
                      </Text>
                    </View>
                    <Text style={[typo.h3, { color: colors.text }]}>{formatCalories(groupCalories)} kcal</Text>
                  </TouchableOpacity>
                </Card>
              );
            })}

            {/* Workouts */}
            {workouts.workouts.map((w) => (
              <Card key={w.id} style={{ padding: 0, marginBottom: spacing.sm }}>
                <TouchableOpacity
                  style={[styles.ledgerRow, { borderBottomWidth: 0, paddingHorizontal: spacing.md }]}
                  onPress={() => navigation.navigate('Workout')}
                  activeOpacity={0.7}
                >
                  <View style={styles.ledgerIconContainer}>
                    <Ionicons name="barbell" size={24} color={colors.primary} />
                  </View>
                  <View style={styles.ledgerContent}>
                    <Text style={[typo.body, { color: colors.text }]}>{w.exerciseName}</Text>
                    <Text style={[typo.caption, { color: colors.textDim }]}>
                      {w.sets} sets
                      {w.reps ? ` × ${w.reps} reps` : ''}
                      {w.weightKg ? ` @ ${w.weightKg}kg` : ''}
                      {w.caloriesBurned ? ` • 🔥 ${w.caloriesBurned} kcal` : ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              </Card>
            ))}

            {/* Weight */}
            {dashboard.weight.latest !== null && (
              <Card style={{ padding: 0, marginBottom: spacing.sm }}>
                <View style={[styles.ledgerRow, { borderBottomWidth: 0, paddingHorizontal: spacing.md }]}>
                  <View style={styles.ledgerIconContainer}>
                    <Ionicons name="scale" size={24} color={colors.primary} />
                  </View>
                  <View style={styles.ledgerContent}>
                    <Text style={[typo.body, { color: colors.text }]}>Weight</Text>
                    <Text style={[typo.caption, { color: colors.textDim }]}>Current</Text>
                  </View>
                  <Text style={[typo.h3, { color: colors.text }]}>{dashboard.weight.latest} kg</Text>
                </View>
              </Card>
            )}
          </View>
        )}

        {/* QUICK ACTIONS ROW */}
        <View style={[styles.quickActions, { marginTop: spacing.lg, marginBottom: spacing.xl }]}>
          <TouchableOpacity
            style={[styles.quickActionButton, { backgroundColor: colors.surface, borderRadius: borderRadius.md, borderColor: colors.border }]}
            onPress={() => setShowMealAction(true)}
          >
            <Ionicons name="restaurant" size={20} color={colors.primary} />
            <Text style={[typo.buttonSmall, { color: colors.text, marginLeft: spacing.xs }]}>Log Meal</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickActionButton, { backgroundColor: colors.surface, borderRadius: borderRadius.md, borderColor: colors.border }]}
            onPress={() => setShowQuickLog(true)}
          >
            <Ionicons name="barbell" size={20} color={colors.primary} />
            <Text style={[typo.buttonSmall, { color: colors.text, marginLeft: spacing.xs }]}>Log Workout</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickActionButton, { backgroundColor: colors.surface, borderRadius: borderRadius.md, borderColor: colors.border }]}
            onPress={() => waterMutation.mutate()}
            disabled={waterMutation.isPending}
          >
            <Ionicons name="water" size={20} color="#0ea5e9" />
            <Text style={[typo.buttonSmall, { color: colors.text, marginLeft: spacing.xs }]}>Water</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <QuickLogWorkoutSheet
        visible={showQuickLog}
        onClose={() => setShowQuickLog(false)}
      />
      <MealActionSheet
        visible={showMealAction}
        onClose={() => setShowMealAction(false)}
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
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroLeft: {
    flex: 1,
    marginRight: 24,
  },
  heroRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  macroLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  upsell: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  ledgerIconContainer: {
    width: 48,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  ledgerContent: {
    flex: 1,
    paddingRight: 16,
  },
  waterBarBg: {
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    overflow: 'hidden',
    width: '80%',
  },
  waterBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  waterAddBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Skeletons
  skeletonHeader: { width: 200, height: 48, marginBottom: 24, marginHorizontal: 24 },
  skeletonHero: { height: 160, marginBottom: 32, marginHorizontal: 24 },
  skeletonRow: { height: 64, marginBottom: 24, marginHorizontal: 24 },
  skeletonBlock: { height: 200, marginHorizontal: 24 },
});
