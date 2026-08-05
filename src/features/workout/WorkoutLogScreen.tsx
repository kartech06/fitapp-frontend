/**
 * WorkoutLogScreen — Full structured workout logging screen.
 *
 * Features:
 * - Pretends/initializes today's planned exercises from active plan OR free-text entry
 * - Per-exercise set rows with reps & weight inputs + "Add set" button
 * - Rest timer between sets (automatic countdown when set marked completed)
 * - "Finish Workout" button -> submits all logged exercises -> invalidates queries
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../shared/hooks/useTheme';
import { ScreenHeader } from '../../shared/components/ScreenHeader';
import { Button } from '../../shared/components/Button';
import { Card } from '../../shared/components/Card';
import {
  logWorkout,
  searchExercises,
  type ExerciseMaster,
} from '../../shared/api/workout.api';
import type { RootStackParamList } from '../../shared/navigation/types';

type WorkoutLogRouteProp = RouteProp<RootStackParamList, 'WorkoutLog'>;

interface SetRow {
  id: string;
  setNum: number;
  reps: string;
  weightKg: string;
  completed: boolean;
}

interface ExerciseLogCard {
  tempId: string;
  exerciseId?: string;
  name: string;
  sets: SetRow[];
}

export function WorkoutLogScreen() {
  const { colors, typography: typo, spacing, borderRadius } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<WorkoutLogRouteProp>();
  const queryClient = useQueryClient();

  // Initialize exercises from route params if available
  const [exercises, setExercises] = useState<ExerciseLogCard[]>(() => {
    const planned = route.params?.plannedExercises;
    if (planned && planned.length > 0) {
      return planned.map((item, idx) => ({
        tempId: `plan-${idx}-${Date.now()}`,
        exerciseId: item.exerciseId || item.id,
        name: item.name,
        sets: Array.from({ length: item.sets || 3 }, (_, sIdx) => ({
          id: `set-${idx}-${sIdx}`,
          setNum: sIdx + 1,
          reps: (item.reps || 10).toString(),
          weightKg: item.weightKg ? item.weightKg.toString() : '',
          completed: false,
        })),
      }));
    }
    return [];
  });

  // Rest Timer State
  const [restTimerSeconds, setRestTimerSeconds] = useState(0);
  const [isRestTimerActive, setIsRestTimerActive] = useState(false);

  // Add Exercise Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExercise, setSelectedExercise] = useState<ExerciseMaster | null>(null);
  const [customExerciseName, setCustomExerciseName] = useState('');
  const [newSetsCount, setNewSetsCount] = useState('3');
  const [newRepsCount, setNewRepsCount] = useState('10');
  const [newWeight, setNewWeight] = useState('');

  // Timer useEffect
  useEffect(() => {
    let interval: any = null;
    if (isRestTimerActive && restTimerSeconds > 0) {
      interval = setInterval(() => {
        setRestTimerSeconds((prev) => {
          if (prev <= 1) {
            setIsRestTimerActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (restTimerSeconds === 0) {
      setIsRestTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [isRestTimerActive, restTimerSeconds]);

  // Autocomplete search query
  const { data: searchResults, isFetching: isSearching } = useQuery({
    queryKey: ['exerciseSearchLog', searchQuery],
    queryFn: () => searchExercises(searchQuery, 1, 10),
    enabled: searchQuery.trim().length >= 2 && !selectedExercise && showAddModal,
  });

  const triggerRestTimer = (seconds: number = 60) => {
    setRestTimerSeconds(seconds);
    setIsRestTimerActive(true);
  };

  const handleToggleSet = (exIndex: number, setIndex: number) => {
    setExercises((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as ExerciseLogCard[];
      const wasCompleted = next[exIndex].sets[setIndex].completed;
      next[exIndex].sets[setIndex].completed = !wasCompleted;
      if (!wasCompleted) {
        // Trigger rest timer when marking set done
        triggerRestTimer(60);
      }
      return next;
    });
  };

  const handleAddSet = (exIndex: number) => {
    setExercises((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as ExerciseLogCard[];
      const lastSet = next[exIndex].sets[next[exIndex].sets.length - 1];
      const newSetNum = (lastSet?.setNum || 0) + 1;
      next[exIndex].sets.push({
        id: `set-${exIndex}-${Date.now()}`,
        setNum: newSetNum,
        reps: lastSet ? lastSet.reps : '10',
        weightKg: lastSet ? lastSet.weightKg : '',
        completed: false,
      });
      return next;
    });
  };

  const handleRemoveExercise = (exIndex: number) => {
    setExercises((prev) => prev.filter((_, idx) => idx !== exIndex));
  };

  const handleAddExerciseToWorkout = () => {
    const nameToAdd = selectedExercise ? selectedExercise.name : customExerciseName.trim() || searchQuery.trim();
    if (!nameToAdd) {
      Alert.alert('Error', 'Please enter or select an exercise name.');
      return;
    }
    const setsNum = parseInt(newSetsCount, 10) || 3;
    const repsVal = (parseInt(newRepsCount, 10) || 10).toString();
    const weightVal = newWeight.trim();

    const newExCard: ExerciseLogCard = {
      tempId: `custom-${Date.now()}`,
      exerciseId: selectedExercise?.id,
      name: nameToAdd,
      sets: Array.from({ length: setsNum }, (_, sIdx) => ({
        id: `set-new-${sIdx}-${Date.now()}`,
        setNum: sIdx + 1,
        reps: repsVal,
        weightKg: weightVal,
        completed: false,
      })),
    };

    setExercises((prev) => [...prev, newExCard]);
    setShowAddModal(false);
    setSearchQuery('');
    setCustomExerciseName('');
    setSelectedExercise(null);
  };

  const finishWorkoutMutation = useMutation({
    mutationFn: async () => {
      if (exercises.length === 0) {
        throw new Error('No exercises in this workout session.');
      }

      // For each exercise, log the session to backend
      const logPromises = exercises.map(async (ex) => {
        const completedSets = ex.sets.filter((s) => s.completed);
        const setsToUse = completedSets.length > 0 ? completedSets : ex.sets;
        const firstSet = setsToUse[0];

        return logWorkout({
          exerciseId: ex.exerciseId,
          exerciseName: ex.name,
          sets: setsToUse.length,
          reps: parseInt(firstSet.reps, 10) || 10,
          weightKg: parseFloat(firstSet.weightKg) || undefined,
        });
      });

      return Promise.all(logPromises);
    },
    onSuccess: (loggedResults) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['workoutsToday'] });
      queryClient.invalidateQueries({ queryKey: ['todayWorkout'] });
      queryClient.invalidateQueries({ queryKey: ['workoutHistory'] });
      setIsRestTimerActive(false);
      Alert.alert(
        'Workout Completed! 🔥',
        `Great job! Successfully logged ${loggedResults.length} exercises.`,
        [{ text: 'Awesome', onPress: () => navigation.goBack() }]
      );
    },
    onError: (err: any) => {
      Alert.alert('Error', err.message || 'Failed to submit workout logs.');
    },
  });

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="Active Workout"
        onBack={() => {
          Alert.alert(
            'Leave Workout?',
            'Your progress in this session will not be saved.',
            [
              { text: 'Keep Logging', style: 'cancel' },
              { text: 'Leave', style: 'destructive', onPress: () => navigation.goBack() },
            ]
          );
        }}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: spacing.md,
          paddingBottom: insets.bottom + 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topInfoRow}>
          <Text style={[typo.h3, { color: colors.text }]}>Today's Session</Text>
          <Text style={[typo.caption, { color: colors.textSecondary }]}>
            {exercises.length} {exercises.length === 1 ? 'Exercise' : 'Exercises'}
          </Text>
        </View>

        {exercises.length === 0 ? (
          <Card style={{ padding: spacing.xl, alignItems: 'center', marginVertical: spacing.lg }}>
            <Ionicons name="barbell-outline" size={48} color={colors.primary} style={{ marginBottom: spacing.md }} />
            <Text style={[typo.h3, { color: colors.text, textAlign: 'center', marginBottom: spacing.xs }]}>
              No Exercises Yet
            </Text>
            <Text style={[typo.bodySmall, { color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg }]}>
              Add exercises to start tracking your sets, reps, and weights for today's workout!
            </Text>
            <Button
              title="+ Add Exercise"
              onPress={() => setShowAddModal(true)}
              size="small"
            />
          </Card>
        ) : (
          exercises.map((ex, exIdx) => (
            <Card key={ex.tempId} style={{ marginBottom: spacing.md, padding: spacing.md }}>
              <View style={styles.exHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[typo.h3, { color: colors.text }]}>{ex.name}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleRemoveExercise(exIdx)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                </TouchableOpacity>
              </View>

              {/* Sets Header */}
              <View style={[styles.setRowHeader, { borderBottomColor: colors.border, paddingBottom: spacing.xs, marginBottom: spacing.xs }]}>
                <Text style={[typo.caption, { color: colors.textSecondary, width: 45, textAlign: 'center' }]}>SET</Text>
                <Text style={[typo.caption, { color: colors.textSecondary, flex: 1, textAlign: 'center' }]}>KG</Text>
                <Text style={[typo.caption, { color: colors.textSecondary, flex: 1, textAlign: 'center' }]}>REPS</Text>
                <Text style={[typo.caption, { color: colors.textSecondary, width: 50, textAlign: 'center' }]}>DONE</Text>
              </View>

              {/* Set Rows */}
              {ex.sets.map((set, setIdx) => (
                <View
                  key={set.id}
                  style={[
                    styles.setRow,
                    {
                      backgroundColor: set.completed ? colors.primary + '15' : 'transparent',
                      borderRadius: borderRadius.sm,
                      paddingVertical: spacing.xs,
                    },
                  ]}
                >
                  <Text style={[typo.body, { color: colors.text, width: 45, textAlign: 'center', fontWeight: '700' }]}>
                    {set.setNum}
                  </Text>

                  <View style={{ flex: 1, paddingHorizontal: 4 }}>
                    <TextInput
                      style={[
                        styles.cellInput,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                          color: colors.text,
                          borderRadius: borderRadius.sm,
                        },
                      ]}
                      keyboardType="decimal-pad"
                      value={set.weightKg}
                      onChangeText={(val) => {
                        setExercises((prev) => {
                          const next = JSON.parse(JSON.stringify(prev)) as ExerciseLogCard[];
                          next[exIdx].sets[setIdx].weightKg = val;
                          return next;
                        });
                      }}
                      placeholder="0"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>

                  <View style={{ flex: 1, paddingHorizontal: 4 }}>
                    <TextInput
                      style={[
                        styles.cellInput,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                          color: colors.text,
                          borderRadius: borderRadius.sm,
                        },
                      ]}
                      keyboardType="numeric"
                      value={set.reps}
                      onChangeText={(val) => {
                        setExercises((prev) => {
                          const next = JSON.parse(JSON.stringify(prev)) as ExerciseLogCard[];
                          next[exIdx].sets[setIdx].reps = val;
                          return next;
                        });
                      }}
                      placeholder="10"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>

                  <TouchableOpacity
                    style={{ width: 50, alignItems: 'center', justifyContent: 'center' }}
                    onPress={() => handleToggleSet(exIdx, setIdx)}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        {
                          backgroundColor: set.completed ? colors.primary : colors.surface,
                          borderColor: set.completed ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      {set.completed && <Ionicons name="checkmark" size={16} color="#000" />}
                    </View>
                  </TouchableOpacity>
                </View>
              ))}

              {/* Add Set Button */}
              <TouchableOpacity
                style={[styles.addSetButton, { borderColor: colors.border, borderRadius: borderRadius.md, marginTop: spacing.sm }]}
                onPress={() => handleAddSet(exIdx)}
              >
                <Ionicons name="add" size={18} color={colors.primary} />
                <Text style={[typo.buttonSmall, { color: colors.primary, marginLeft: spacing.xs }]}>
                  Add Set
                </Text>
              </TouchableOpacity>
            </Card>
          ))
        )}

        {/* Add Exercise CTA */}
        <TouchableOpacity
          style={[
            styles.addExerciseCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.primary,
              borderRadius: borderRadius.lg,
              padding: spacing.md,
            },
          ]}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add-circle" size={24} color={colors.primary} />
          <Text style={[typo.h3, { color: colors.primary, marginLeft: spacing.sm }]}>
            Add Exercise
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Floating Rest Timer Banner */}
      {isRestTimerActive && (
        <View
          style={[
            styles.restBanner,
            {
              backgroundColor: colors.surface,
              borderColor: colors.primary,
              borderRadius: borderRadius.lg,
              bottom: insets.bottom + 80,
              marginHorizontal: spacing.md,
            },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Ionicons name="timer-outline" size={24} color={colors.primary} style={{ marginRight: spacing.sm }} />
            <View>
              <Text style={[typo.caption, { color: colors.textSecondary }]}>REST TIMER</Text>
              <Text style={[typo.h2, { color: colors.primary }]}>{formatTimer(restTimerSeconds)}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.xs }}>
            <TouchableOpacity
              style={[styles.timerBtn, { backgroundColor: colors.primary + '20', borderRadius: borderRadius.sm }]}
              onPress={() => setRestTimerSeconds((prev) => prev + 30)}
            >
              <Text style={[typo.buttonSmall, { color: colors.primary }]}>+30s</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.timerBtn, { backgroundColor: colors.border, borderRadius: borderRadius.sm }]}
              onPress={() => setIsRestTimerActive(false)}
            >
              <Text style={[typo.buttonSmall, { color: colors.text }]}>Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Bottom Sticky Finish Button */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + spacing.sm,
            paddingTop: spacing.sm,
            paddingHorizontal: spacing.md,
          },
        ]}
      >
        <Button
          title={finishWorkoutMutation.isPending ? 'Saving Workout...' : 'Finish Workout 💪'}
          onPress={() => finishWorkoutMutation.mutate()}
          loading={finishWorkoutMutation.isPending}
          disabled={exercises.length === 0 || finishWorkoutMutation.isPending}
        />
      </View>

      {/* Add Exercise Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: colors.background,
                borderTopLeftRadius: borderRadius.xl,
                borderTopRightRadius: borderRadius.xl,
                padding: spacing.lg,
                paddingBottom: insets.bottom + spacing.lg,
                maxHeight: '85%',
              },
            ]}
          >
            <View style={styles.exHeaderRow}>
              <Text style={[typo.h2, { color: colors.text }]}>Add Exercise</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ marginVertical: spacing.md }}>
              <Text style={[typo.label, { color: colors.text, marginBottom: spacing.xs }]}>SEARCH OR TYPE NAME</Text>
              <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: borderRadius.md }]}>
                <Ionicons name="search" size={20} color={colors.textSecondary} style={{ marginRight: spacing.sm }} />
                <TextInput
                  style={[typo.body, { flex: 1, color: colors.text, paddingVertical: spacing.sm }]}
                  placeholder="e.g. Incline Dumbbell Press"
                  placeholderTextColor={colors.textSecondary}
                  value={searchQuery}
                  onChangeText={(text) => {
                    setSearchQuery(text);
                    setCustomExerciseName(text);
                    if (selectedExercise && text !== selectedExercise.name) {
                      setSelectedExercise(null);
                    }
                  }}
                />
              </View>

              {/* Autocomplete Results */}
              {!selectedExercise && searchQuery.trim().length >= 2 && (
                <View style={[styles.dropdown, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: borderRadius.md }]}>
                  {isSearching ? (
                    <ActivityIndicator color={colors.primary} style={{ margin: spacing.md }} />
                  ) : searchResults && searchResults.exercises.length > 0 ? (
                    searchResults.exercises.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.resultRow, { borderBottomColor: colors.border }]}
                        onPress={() => {
                          setSelectedExercise(item);
                          setSearchQuery(item.name);
                          setCustomExerciseName(item.name);
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[typo.body, { color: colors.text, fontWeight: '600' }]}>{item.name}</Text>
                          <Text style={[typo.caption, { color: colors.textSecondary }]}>{item.primaryMuscles.join(', ')}</Text>
                        </View>
                        <Ionicons name="add-circle" size={22} color={colors.primary} />
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text style={[typo.bodySmall, { color: colors.textSecondary, padding: spacing.sm }]}>
                      Custom exercise will be added: "{searchQuery}"
                    </Text>
                  )}
                </View>
              )}
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
              <View style={{ flex: 1 }}>
                <Text style={[typo.label, { color: colors.text, marginBottom: spacing.xs }]}>SETS</Text>
                <TextInput
                  style={[styles.numCell, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: borderRadius.md, color: colors.text }, typo.h3]}
                  keyboardType="numeric"
                  value={newSetsCount}
                  onChangeText={setNewSetsCount}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typo.label, { color: colors.text, marginBottom: spacing.xs }]}>REPS</Text>
                <TextInput
                  style={[styles.numCell, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: borderRadius.md, color: colors.text }, typo.h3]}
                  keyboardType="numeric"
                  value={newRepsCount}
                  onChangeText={setNewRepsCount}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typo.label, { color: colors.text, marginBottom: spacing.xs }]}>KG (OPT)</Text>
                <TextInput
                  style={[styles.numCell, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: borderRadius.md, color: colors.text }, typo.h3]}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  value={newWeight}
                  onChangeText={setNewWeight}
                />
              </View>
            </View>

            <Button
              title="Add to Workout 💪"
              onPress={handleAddExerciseToWorkout}
              disabled={!searchQuery.trim()}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  exHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  setRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  cellInput: {
    borderWidth: 1,
    textAlign: 'center',
    paddingVertical: 6,
    fontSize: 15,
    fontWeight: '600',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    paddingVertical: 8,
  },
  addExerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  restBanner: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  timerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  dropdown: {
    borderWidth: 1,
    maxHeight: 180,
    marginTop: 4,
    overflow: 'hidden',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  numCell: {
    borderWidth: 1,
    textAlign: 'center',
    paddingVertical: 10,
  },
});
