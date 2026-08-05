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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../shared/hooks/useTheme';
import { useAuthStore } from '../../shared/store/authStore';
import { ProgressRing } from '../../shared/components/ProgressRing';
import { MacroBar } from '../../shared/components/MacroBar';
import { Card } from '../../shared/components/Card';
import { Badge } from '../../shared/components/Badge';
import { getDashboardToday, type DashboardAggregated } from '../../shared/api/dashboard.api';
import { logWater } from '../../shared/api/water.api';
import { formatCalories } from '../../shared/utils/format';
import type { AppTabParamList } from '../../shared/navigation/types';
import { QuickLogWorkoutSheet } from '../workout/QuickLogWorkoutSheet';

type DashboardNav = BottomTabNavigationProp<AppTabParamList, 'Today'>;

export function DashboardScreen() {
  const { colors, typography: typo, spacing, borderRadius } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<DashboardNav>();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [showQuickLog, setShowQuickLog] = useState(false);

  // Fetch dashboard + meals + workouts for today
  const { data, isLoading, refetch, isRefetching } = useQuery<DashboardAggregated>({
    queryKey: ['dashboard'],
    queryFn: getDashboardToday,
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

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  // Render skeleton while loading
  if (isLoading || !data) {
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
            onRefresh={refetch}
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
            <View style={[styles.ledgerRow, { borderBottomColor: colors.border }]}>
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

            {/* Meals */}
            {Object.entries(meals.meals).map(([mealType, mealList]) => {
              if (!mealList || mealList.length === 0) return null;
              
              const groupCalories = Math.round(mealList.reduce((sum, m) => sum + m.calories, 0));
              const label = mealType.replace('_', ' ');

              return (
                <TouchableOpacity
                  key={mealType}
                  style={[styles.ledgerRow, { borderBottomColor: colors.border }]}
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
              );
            })}

            {/* Workouts */}
            {workouts.workouts.map((w) => (
              <TouchableOpacity
                key={w.id}
                style={[styles.ledgerRow, { borderBottomColor: colors.border }]}
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
                  </Text>
                </View>
              </TouchableOpacity>
            ))}

            {/* Weight */}
            {dashboard.weight.latest !== null && (
              <View style={[styles.ledgerRow, { borderBottomColor: colors.border, borderBottomWidth: 0 }]}>
                <View style={styles.ledgerIconContainer}>
                  <Ionicons name="scale" size={24} color={colors.primary} />
                </View>
                <View style={styles.ledgerContent}>
                  <Text style={[typo.body, { color: colors.text }]}>Weight</Text>
                  <Text style={[typo.caption, { color: colors.textDim }]}>Current</Text>
                </View>
                <Text style={[typo.h3, { color: colors.text }]}>{dashboard.weight.latest} kg</Text>
              </View>
            )}
          </View>
        )}

        {/* QUICK ACTIONS ROW */}
        <View style={[styles.quickActions, { marginTop: spacing.xl, marginBottom: spacing.xl }]}>
          <TouchableOpacity
            style={[styles.quickActionButton, { backgroundColor: colors.surface, borderRadius: borderRadius.md, borderColor: colors.border }]}
            onPress={() => {
              // TODO: Open meal logger bottom sheet (Phase 4)
              console.log('Open meal logger');
            }}
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
