/**
 * WorkoutScreen — Main tab screen for the Workout feature.
 *
 * States:
 * - No active plan → empty state with "Generate" CTA (BASIC only, upgrade prompt for FREE)
 * - Active plan → week pills, day pills, today's exercises, start workout / complete week
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
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useTheme } from '../../shared/hooks/useTheme';
import { useAuthStore } from '../../shared/store/authStore';
import { AIPanel } from '../../shared/components/AIPanel';
import { Card } from '../../shared/components/Card';
import { Button } from '../../shared/components/Button';
import {
  getActivePlan,
  getTodayWorkout,
  completeWeek,
  abandonPlan,
  recoverMissedDay,
  type WorkoutPlan,
  type TodayWorkoutResponse,
  type PlanExercise,
} from '../../shared/api/workout.api';
import { WorkoutGenerateSheet } from './WorkoutGenerateSheet';
import { ExerciseDetailModal } from './ExerciseDetailModal';
import { QuickLogWorkoutSheet } from './QuickLogWorkoutSheet';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function WorkoutScreen() {
  const { colors, typography: typo, spacing, borderRadius } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const plan = useAuthStore((s) => s.plan);

  const [showGenerateSheet, setShowGenerateSheet] = useState(false);
  const [showQuickLogSheet, setShowQuickLogSheet] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<PlanExercise | null>(null);

  // Fetch active plan
  const {
    data: activePlan,
    isLoading: planLoading,
    refetch: refetchPlan,
    isRefetching,
    error: planError,
  } = useQuery<WorkoutPlan>({
    queryKey: ['workoutPlan'],
    queryFn: getActivePlan,
    retry: false,
  });

  // Fetch today's workout
  const { data: todayWorkout } = useQuery<TodayWorkoutResponse>({
    queryKey: ['todayWorkout'],
    queryFn: getTodayWorkout,
    enabled: !!activePlan,
    retry: false,
  });

  // Complete week mutation
  const completeWeekMutation = useMutation({
    mutationFn: () => completeWeek(activePlan!.id),
    onSuccess: (res) => {
      let msg = res.message;
      if (res.completionSummary) {
        msg = `You completed ${res.completionSummary.completedDays}/${res.completionSummary.totalDays} days this week.\n\n${msg}`;
      }
      Alert.alert(
        res.isDeload ? '🧘 Deload Week' : '🎉 Week Complete!',
        msg,
      );
      queryClient.invalidateQueries({ queryKey: ['workoutPlan'] });
      queryClient.invalidateQueries({ queryKey: ['todayWorkout'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const recoverMissedDayMutation = useMutation({
    mutationFn: ({ index, action }: { index: number; action: 'DO_TODAY' | 'SKIP' }) =>
      recoverMissedDay(activePlan!.id, { missedDayIndex: index, action }),
    onSuccess: (res) => {
      Alert.alert('Success', res.message);
      queryClient.invalidateQueries({ queryKey: ['todayWorkout'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'Failed to recover day');
    },
  });

  // Abandon plan mutation
  const abandonMutation = useMutation({
    mutationFn: () => abandonPlan(activePlan!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workoutPlan'] });
      queryClient.invalidateQueries({ queryKey: ['todayWorkout'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const handleAbandon = useCallback(() => {
    Alert.alert(
      'Abandon Plan',
      'Are you sure you want to abandon your current workout plan? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Abandon',
          style: 'destructive',
          onPress: () => abandonMutation.mutate(),
        },
      ],
    );
  }, [abandonMutation]);

  const hasNoPlan =
    !planLoading &&
    ((planError as any)?.response?.data?.error_code === 'NO_ACTIVE_PLAN' ||
      !activePlan);

  // Today's day index (Mon=0 .. Sat=5), -1 for Sunday
  const todayDayOfWeek = new Date().getDay();
  const todayIndex = todayDayOfWeek === 0 ? -1 : todayDayOfWeek - 1;

  // Get current week's exercises for the selected day (today)
  const currentWeekDays = activePlan?.days.filter(
    (d) => d.weekNumber === activePlan.currentWeek,
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing.md,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: spacing.lg,
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetchPlan}
            tintColor={colors.primary}
          />
        }
      >
        {/* HEADER */}
        <View style={[styles.headerRow, { marginBottom: spacing.lg }]}>
          <Text style={[typo.h2, { color: colors.text }]}>Workout</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <TouchableOpacity onPress={() => setShowQuickLogSheet(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="add-circle-outline" size={26} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('WorkoutHistory' as never)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="time-outline" size={26} color={colors.text} />
            </TouchableOpacity>
            {activePlan && (
              <TouchableOpacity onPress={handleAbandon} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="ellipsis-horizontal" size={24} color={colors.textDim} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* LOADING SKELETON */}
        {planLoading && (
          <View>
            <View style={[styles.skeletonBar, { backgroundColor: colors.surface2, borderRadius: borderRadius.md }]} />
            <View style={[styles.skeletonBlock, { backgroundColor: colors.surface, borderRadius: borderRadius.lg }]} />
            <View style={[styles.skeletonBlock, { backgroundColor: colors.surface, borderRadius: borderRadius.lg, height: 80 }]} />
          </View>
        )}

        {/* NO ACTIVE PLAN STATE */}
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
                <Ionicons name="barbell-outline" size={48} color={colors.textDim} />
              </View>

              <Text
                style={[
                  typo.h3,
                  { color: colors.text, textAlign: 'center', marginTop: spacing.lg },
                ]}
              >
                No workout plan yet
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
                {plan === 'BASIC'
                  ? 'Generate a personalized AI workout plan tailored to your goals and equipment.'
                  : 'Upgrade to Basic to unlock AI-generated workout plans with progressive overload.'}
              </Text>

              {plan === 'BASIC' ? (
                <View style={{ gap: 12, width: '100%' }}>
                  <Button
                    title="Generate AI Workout Plan ✦"
                    onPress={() => setShowGenerateSheet(true)}
                  />
                  <Button
                    title="+ Log Custom Workout"
                    variant="outline"
                    onPress={() => navigation.navigate('WorkoutLog' as never)}
                  />
                </View>
              ) : (
                <View style={{ gap: 12, width: '100%' }}>
                  <Button
                    title="Upgrade to Basic"
                    onPress={() => {
                      Alert.alert('Coming soon', 'In-app purchases coming in a future update.');
                    }}
                  />
                  <Button
                    title="+ Log Custom Workout"
                    variant="outline"
                    onPress={() => navigation.navigate('WorkoutLog' as never)}
                  />
                </View>
              )}
            </View>
          </View>
        )}

        {/* ACTIVE PLAN VIEW */}
        {activePlan && !planLoading && (
          <View>
            {/* Week & Template Name */}
            <View style={[styles.planHeader, { marginBottom: spacing.md }]}>
              <View>
                <Text style={[typo.h3, { color: colors.text }]}>
                  {activePlan.template.name}
                </Text>
                <Text style={[typo.caption, { color: colors.textDim, marginTop: 2 }]}>
                  Week {activePlan.currentWeek} · {activePlan.template.splitType.replace(/_/g, ' ')}
                </Text>
              </View>
              <View
                style={[
                  styles.weekPill,
                  {
                    backgroundColor: colors.primary,
                    borderRadius: borderRadius.full,
                  },
                ]}
              >
                <Text style={[typo.buttonSmall, { color: colors.textOnPrimary }]}>
                  W{activePlan.currentWeek}
                </Text>
              </View>
            </View>

            {/* Day Pills Row */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: spacing.lg }}
              contentContainerStyle={{ gap: spacing.sm }}
            >
              {DAY_LABELS.slice(0, activePlan.template.daysPerWeek).map(
                (label, index) => {
                  const isToday = index === todayIndex;
                  const dayData = currentWeekDays?.find((d) => d.dayIndex === index);
                  return (
                    <TouchableOpacity
                      key={label}
                      style={[
                        styles.dayPill,
                        {
                          backgroundColor: isToday
                            ? colors.primary
                            : colors.surface,
                          borderColor: isToday ? colors.primary : colors.border,
                          borderRadius: borderRadius.md,
                        },
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          typo.caption,
                          {
                            color: isToday
                              ? colors.textOnPrimary
                              : colors.textDim,
                          },
                        ]}
                      >
                        {label}
                      </Text>
                      <Text
                        style={[
                          typo.buttonSmall,
                          {
                            color: isToday
                              ? colors.textOnPrimary
                              : colors.text,
                            marginTop: 2,
                          },
                        ]}
                      >
                        {dayData?.dayName ?? 'Rest'}
                      </Text>
                    </TouchableOpacity>
                  );
                },
              )}
            </ScrollView>

            {/* AI Panel */}
            <AIPanel label="AI Plan" style={{ marginBottom: spacing.lg }}>
              <Text style={[typo.body, { color: colors.aiText }]}>
                Built for your goal and experience level. Sets/reps progress automatically each week.
              </Text>
            </AIPanel>

            {/* Missed Days Banner */}
            {!todayWorkout?.overrideDay && (todayWorkout?.missedDays?.length ?? 0) > 0 && (
              <View style={{ marginBottom: spacing.lg }}>
                {todayWorkout!.missedDays!.map((md) => (
                  <Card key={md.dayIndex} style={{ marginBottom: spacing.sm, backgroundColor: `${colors.error}10`, borderColor: `${colors.error}30` }}>
                    <Text style={[typo.h3, { color: colors.text, marginBottom: spacing.xs }]}>
                      You missed: {md.dayName}
                    </Text>
                    <Text style={[typo.body, { color: colors.textDim, marginBottom: spacing.md }]}>
                      Scheduled for {md.date}. What would you like to do?
                    </Text>
                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                      <View style={{ flex: 1 }}>
                        <Button
                          title="Do it today"
                          variant="primary"
                          onPress={() => recoverMissedDayMutation.mutate({ index: md.dayIndex, action: 'DO_TODAY' })}
                          disabled={recoverMissedDayMutation.isPending}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Button
                          title="Skip"
                          variant="outline"
                          onPress={() => recoverMissedDayMutation.mutate({ index: md.dayIndex, action: 'SKIP' })}
                          disabled={recoverMissedDayMutation.isPending}
                        />
                      </View>
                    </View>
                  </Card>
                ))}
              </View>
            )}

            {/* Override Day Choice */}
            {todayWorkout?.overrideDay && (
              <View style={{ marginBottom: spacing.lg }}>
                <Text style={[typo.h3, { color: colors.text, marginBottom: spacing.sm }]}>Choose your workout</Text>
                
                {/* Recovering Card */}
                <Card style={{ marginBottom: spacing.sm, borderColor: colors.primary }}>
                  <Text style={[typo.caption, { color: colors.primary, fontWeight: 'bold', marginBottom: 4 }]}>RECOVERING MISSED</Text>
                  <Text style={[typo.h3, { color: colors.text, marginBottom: spacing.sm }]}>{todayWorkout.overrideDay.dayName}</Text>
                  <Button
                    title={todayWorkout.overrideDay.isCompletedToday ? "Review Workout" : "Start Workout 💪"}
                    variant={todayWorkout.overrideDay.isCompletedToday ? "outline" : "primary"}
                    onPress={() => {
                      navigation.navigate('WorkoutLog' as never, {
                        plannedExercises: todayWorkout!.overrideDay!.exercises.map((e) => ({
                          planExerciseId: e.id,
                          exerciseId: e.exerciseId || e.id,
                          name: e.exercise.name,
                          actualExerciseName: e.actualExerciseName,
                          sets: e.sets,
                          reps: e.reps,
                          weightKg: e.targetWeightKg,
                          completedToday: e.completedToday,
                          primaryMuscles: e.exercise.primaryMuscles,
                        })),
                      } as never);
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
                        navigation.navigate('WorkoutLog' as never, {
                          plannedExercises: todayWorkout!.exercises!.map((e) => ({
                            planExerciseId: e.id,
                            exerciseId: e.exerciseId || e.id,
                            name: e.exercise.name,
                            actualExerciseName: e.actualExerciseName,
                            sets: e.sets,
                            reps: e.reps,
                            weightKg: e.targetWeightKg,
                            completedToday: e.completedToday,
                            primaryMuscles: e.exercise.primaryMuscles,
                          })),
                        } as never);
                      }}
                    />
                  )}
                </Card>
              </View>
            )}

            {/* Today's Exercises or Rest Day */}
            {!todayWorkout?.overrideDay && (todayWorkout?.isRestDay ? (
              <Card style={{ marginBottom: spacing.lg }}>
                <View style={styles.restDayContent}>
                  <Ionicons name="bed" size={32} color={colors.textDim} />
                  <Text
                    style={[
                      typo.h3,
                      { color: colors.text, marginTop: spacing.sm },
                    ]}
                  >
                    Rest Day
                  </Text>
                  <Text
                    style={[
                      typo.body,
                      {
                        color: colors.textDim,
                        textAlign: 'center',
                        marginTop: spacing.xs,
                      },
                    ]}
                  >
                    Recovery is part of the plan. Come back tomorrow stronger.
                  </Text>
                </View>
              </Card>
            ) : (
              <View>
                {/* Exercise Cards */}
                {(todayWorkout?.exercises || []).map((exercise, i) => (
                  <TouchableOpacity
                    key={exercise.id}
                    activeOpacity={0.7}
                    onPress={() => setSelectedExercise(exercise)}
                  >
                    <Card style={{ marginBottom: spacing.sm }}>
                      <View style={styles.exerciseRow}>
                        <View style={[styles.exerciseIndex, exercise.completedToday && { backgroundColor: `${colors.success}20` }]}>
                          {exercise.completedToday ? (
                            <Ionicons name="checkmark" size={16} color={colors.success} />
                          ) : (
                            <Text style={[typo.caption, { color: colors.textDim }]}>
                              {i + 1}
                            </Text>
                          )}
                        </View>
                        <View style={styles.exerciseContent}>
                          {exercise.actualExerciseName ? (
                            <>
                              <Text style={[typo.body, { color: colors.text, fontWeight: '600' }]} numberOfLines={1}>
                                {exercise.actualExerciseName}
                              </Text>
                              <Text style={[typo.caption, { color: colors.textDim, textDecorationLine: 'line-through' }]} numberOfLines={1}>
                                {exercise.exercise.name}
                              </Text>
                            </>
                          ) : (
                            <Text
                              style={[typo.body, { color: colors.text, fontWeight: '600' }]}
                              numberOfLines={1}
                            >
                              {exercise.exercise.name}
                            </Text>
                          )}
                          <Text style={[typo.caption, { color: colors.textDim, marginTop: 2 }]}>
                            {exercise.sets} sets × {exercise.reps} reps
                            {exercise.targetWeightKg
                              ? ` × ${exercise.targetWeightKg}kg`
                              : ''}
                          </Text>
                          <View style={[styles.muscleTags, { marginTop: spacing.xs }]}>
                            {exercise.exercise.primaryMuscles.slice(0, 2).map((m) => (
                              <View
                                key={m}
                                style={[
                                  styles.muscleTag,
                                  {
                                    backgroundColor: colors.surface2,
                                    borderRadius: borderRadius.sm,
                                  },
                                ]}
                              >
                                <Text style={[typo.caption, { color: colors.textDim, fontSize: 10 }]}>
                                  {m}
                                </Text>
                              </View>
                            ))}
                            {exercise.exercise.equipment && (
                              <View
                                style={[
                                  styles.muscleTag,
                                  {
                                    backgroundColor: colors.surface2,
                                    borderRadius: borderRadius.sm,
                                  },
                                ]}
                              >
                                <Text style={[typo.caption, { color: colors.textDim, fontSize: 10 }]}>
                                  {exercise.exercise.equipment}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
                      </View>
                    </Card>
                  </TouchableOpacity>
                ))}
              </View>
            ))}

            {/* Action Buttons */}
            <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
              {!todayWorkout?.overrideDay && !todayWorkout?.isRestDay && (todayWorkout?.exercises?.length ?? 0) > 0 && (
                <Button
                  title={todayWorkout?.isCompletedToday ? "Review Workout" : "Start Workout 💪"}
                  variant={todayWorkout?.isCompletedToday ? "outline" : "primary"}
                  onPress={() => {
                    navigation.navigate('WorkoutLog' as never, {
                      plannedExercises: todayWorkout?.exercises?.map((e) => ({
                        planExerciseId: e.id,
                        exerciseId: e.exerciseId || e.id,
                        name: e.exercise.name,
                        actualExerciseName: e.actualExerciseName,
                        sets: e.sets,
                        reps: e.reps,
                        weightKg: e.targetWeightKg,
                        completedToday: e.completedToday,
                        primaryMuscles: e.exercise.primaryMuscles,
                      })),
                    } as never);
                  }}
                />
              )}
              <Button
                title="Complete Week →"
                onPress={() => completeWeekMutation.mutate()}
                variant="ghost"
                loading={completeWeekMutation.isPending}
              />
              <Button
                title="Generate New Plan"
                onPress={() => setShowGenerateSheet(true)}
                variant="outline"
                size="small"
              />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Sheets / Modals */}
      <WorkoutGenerateSheet
        visible={showGenerateSheet}
        onClose={() => setShowGenerateSheet(false)}
      />

      <QuickLogWorkoutSheet
        visible={showQuickLogSheet}
        onClose={() => setShowQuickLogSheet(false)}
      />

      <ExerciseDetailModal
        exercise={selectedExercise}
        onClose={() => setSelectedExercise(null)}
        currentWeek={activePlan?.currentWeek ?? 1}
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
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weekPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  dayPill: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    minWidth: 60,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  exerciseContent: {
    flex: 1,
    paddingRight: 8,
  },
  muscleTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  muscleTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  restDayContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  // Skeletons
  skeletonBar: { width: '60%', height: 24, marginBottom: 24 },
  skeletonBlock: { height: 120, marginBottom: 16 },
});
