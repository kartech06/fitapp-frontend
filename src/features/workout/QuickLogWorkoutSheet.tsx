/**
 * QuickLogWorkoutSheet — Bottom sheet for quick single-exercise or free-text logging.
 *
 * Features:
 * - Autocomplete search against GET /exercises
 * - Sets, reps, weight inputs
 * - Saves session via POST /workouts and invalidates dashboard/workout queries
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../shared/hooks/useTheme';
import { Button } from '../../shared/components/Button';
import {
  searchExercises,
  logWorkout,
  type ExerciseMaster,
} from '../../shared/api/workout.api';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface QuickLogWorkoutSheetProps {
  visible: boolean;
  onClose: () => void;
  initialExerciseName?: string;
  initialSets?: number;
  initialReps?: number;
  initialWeight?: number;
}

export function QuickLogWorkoutSheet({
  visible,
  onClose,
  initialExerciseName = '',
  initialSets = 3,
  initialReps = 10,
  initialWeight = 0,
}: QuickLogWorkoutSheetProps) {
  const { colors, typography: typo, spacing, borderRadius } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState(initialExerciseName);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseMaster | null>(null);
  const [customName, setCustomName] = useState(initialExerciseName);

  const [sets, setSets] = useState(initialSets.toString());
  const [reps, setReps] = useState(initialReps.toString());
  const [weightKg, setWeightKg] = useState(initialWeight ? initialWeight.toString() : '');
  const [durationMins, setDurationMins] = useState('');
  const [notes, setNotes] = useState('');

  // Reset form when opened
  useEffect(() => {
    if (visible) {
      setSearchQuery(initialExerciseName);
      setCustomName(initialExerciseName);
      setSelectedExercise(null);
      setSets(initialSets.toString());
      setReps(initialReps.toString());
      setWeightKg(initialWeight ? initialWeight.toString() : '');
      setDurationMins('');
      setNotes('');
    }
  }, [visible, initialExerciseName, initialSets, initialReps, initialWeight]);

  // Autocomplete search query
  const { data: searchResults, isFetching: isSearching } = useQuery({
    queryKey: ['exerciseSearch', searchQuery],
    queryFn: () => searchExercises(searchQuery, 1, 10),
    enabled: searchQuery.trim().length >= 2 && !selectedExercise,
  });

  const logMutation = useMutation({
    mutationFn: async () => {
      const nameToLog = selectedExercise ? selectedExercise.name : customName.trim() || searchQuery.trim();
      if (!nameToLog) {
        throw new Error('Please enter or select an exercise name');
      }
      const setsNum = parseInt(sets, 10) || 1;
      const repsNum = parseInt(reps, 10) || 1;
      const weightNum = parseFloat(weightKg) || undefined;
      const durationNum = parseFloat(durationMins) || undefined;

      return logWorkout({
        exerciseId: selectedExercise?.id,
        exerciseName: nameToLog,
        sets: setsNum,
        reps: repsNum,
        weightKg: weightNum,
        durationMins: durationNum,
        notes: notes.trim() || undefined,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['workoutsToday'] });
      queryClient.invalidateQueries({ queryKey: ['todayWorkout'] });
      queryClient.invalidateQueries({ queryKey: ['workoutHistory'] });
      Alert.alert('Workout Logged! 🔥', `Logged ${data.sets} sets of ${data.exerciseName}.`);
      onClose();
    },
    onError: (err: any) => {
      Alert.alert('Error', err.message || 'Failed to log workout session.');
    },
  });

  const handleSelectExercise = (item: ExerciseMaster) => {
    setSelectedExercise(item);
    setSearchQuery(item.name);
    setCustomName(item.name);
  };

  if (!visible) return null;

  const activeName = selectedExercise ? selectedExercise.name : customName || searchQuery;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          onPress={onClose}
          activeOpacity={1}
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background,
              borderTopLeftRadius: borderRadius.xl,
              borderTopRightRadius: borderRadius.xl,
              paddingBottom: insets.bottom + spacing.lg,
              maxHeight: SCREEN_HEIGHT * 0.9,
            },
          ]}
        >
          {/* Handle */}
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>

          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: spacing.lg,
              paddingBottom: spacing.lg,
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
          >
            <View style={styles.headerRow}>
              <Text style={[typo.h2, { color: colors.text }]}>Quick Log Workout</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={[typo.bodySmall, { color: colors.textSecondary, marginBottom: spacing.md }]}>
              Search the exercise library or type a custom exercise name to record your sets.
            </Text>

            {/* Exercise Search Input */}
            <View style={styles.section}>
              <Text style={[typo.label, { color: colors.text, marginBottom: spacing.xs }]}>
                EXERCISE NAME
              </Text>
              <View
                style={[
                  styles.searchInputContainer,
                  {
                    backgroundColor: colors.surface,
                    borderColor: selectedExercise ? colors.primary : colors.border,
                    borderRadius: borderRadius.md,
                  },
                ]}
              >
                <Ionicons name="search" size={20} color={colors.textSecondary} style={{ marginRight: spacing.sm }} />
                <TextInput
                  style={[typo.body, { flex: 1, color: colors.text, paddingVertical: spacing.sm }]}
                  placeholder="e.g. Bench Press, Squats..."
                  placeholderTextColor={colors.textSecondary}
                  value={searchQuery}
                  onChangeText={(text) => {
                    setSearchQuery(text);
                    setCustomName(text);
                    if (selectedExercise && text !== selectedExercise.name) {
                      setSelectedExercise(null);
                    }
                  }}
                />
                {selectedExercise && (
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedExercise(null);
                      setSearchQuery('');
                      setCustomName('');
                    }}
                  >
                    <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Autocomplete Results Dropdown */}
              {!selectedExercise && searchQuery.trim().length >= 2 && (
                <View
                  style={[
                    styles.resultsDropdown,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      borderRadius: borderRadius.md,
                      marginTop: spacing.xs,
                    },
                  ]}
                >
                  {isSearching ? (
                    <View style={{ padding: spacing.md, alignItems: 'center' }}>
                      <ActivityIndicator color={colors.primary} size="small" />
                    </View>
                  ) : searchResults && searchResults.exercises.length > 0 ? (
                    <ScrollView
                      style={{ maxHeight: 220 }}
                      keyboardShouldPersistTaps="handled"
                      nestedScrollEnabled={true}
                    >
                      {searchResults.exercises.map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          style={[styles.resultItem, { borderBottomColor: colors.border }]}
                          onPress={() => handleSelectExercise(item)}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={[typo.body, { color: colors.text, fontWeight: '600' }]}>{item.name}</Text>
                            <Text style={[typo.caption, { color: colors.textSecondary }]}>
                              {item.primaryMuscles.join(', ')} • {item.equipment}
                            </Text>
                          </View>
                          <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  ) : (
                    <View style={{ padding: spacing.md }}>
                      <Text style={[typo.bodySmall, { color: colors.textSecondary }]}>
                        No library match. "{searchQuery}" will be logged as custom exercise.
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Selected Badge if chosen */}
            {selectedExercise && (
              <View
                style={[
                  styles.selectedBadge,
                  { backgroundColor: colors.primary + '15', borderColor: colors.primary, borderRadius: borderRadius.md },
                ]}
              >
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} style={{ marginRight: spacing.sm }} />
                <View style={{ flex: 1 }}>
                  <Text style={[typo.bodySmall, { color: colors.primary, fontWeight: '700' }]}>
                    Library Exercise Selected
                  </Text>
                  <Text style={[typo.caption, { color: colors.text }]}>
                    {selectedExercise.name} ({selectedExercise.category})
                  </Text>
                </View>
              </View>
            )}

            {/* Sets & Reps & Weight Grid */}
            <View style={[styles.gridRow, { marginTop: spacing.md, gap: spacing.sm }]}>
              <View style={{ flex: 1 }}>
                <Text style={[typo.label, { color: colors.text, marginBottom: spacing.xs }]}>SETS</Text>
                <TextInput
                  style={[
                    styles.numInput,
                    { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: borderRadius.md, color: colors.text },
                    typo.h3,
                  ]}
                  keyboardType="numeric"
                  value={sets}
                  onChangeText={setSets}
                  placeholder="3"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typo.label, { color: colors.text, marginBottom: spacing.xs }]}>REPS / SET</Text>
                <TextInput
                  style={[
                    styles.numInput,
                    { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: borderRadius.md, color: colors.text },
                    typo.h3,
                  ]}
                  keyboardType="numeric"
                  value={reps}
                  onChangeText={setReps}
                  placeholder="10"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typo.label, { color: colors.text, marginBottom: spacing.xs }]}>WEIGHT (KG)</Text>
                <TextInput
                  style={[
                    styles.numInput,
                    { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: borderRadius.md, color: colors.text },
                    typo.h3,
                  ]}
                  keyboardType="decimal-pad"
                  value={weightKg}
                  onChangeText={setWeightKg}
                  placeholder="0 (Opt)"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            {/* Optional Duration & Notes */}
            <View style={[styles.gridRow, { marginTop: spacing.md, gap: spacing.sm }]}>
              <View style={{ flex: 1 }}>
                <Text style={[typo.label, { color: colors.text, marginBottom: spacing.xs }]}>DURATION (MINS, OPTIONAL)</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: borderRadius.md, color: colors.text },
                    typo.body,
                  ]}
                  keyboardType="numeric"
                  value={durationMins}
                  onChangeText={setDurationMins}
                  placeholder="e.g. 15"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            <View style={{ marginTop: spacing.md }}>
              <Text style={[typo.label, { color: colors.text, marginBottom: spacing.xs }]}>NOTES (OPTIONAL)</Text>
              <TextInput
                style={[
                  styles.textInput,
                  { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: borderRadius.md, color: colors.text, height: 60, textAlignVertical: 'top' },
                  typo.body,
                ]}
                value={notes}
                onChangeText={setNotes}
                placeholder="How did this set feel? Any PRs?"
                placeholderTextColor={colors.textSecondary}
                multiline
              />
            </View>

            {/* Action Buttons */}
            <View style={{ marginTop: spacing.xl, gap: spacing.sm }}>
              <Button
                title={logMutation.isPending ? 'Logging...' : `Log ${activeName || 'Workout'} 💪`}
                onPress={() => logMutation.mutate()}
                loading={logMutation.isPending}
                disabled={!activeName || logMutation.isPending}
              />
              <Button
                title="Cancel"
                variant="ghost"
                onPress={onClose}
                disabled={logMutation.isPending}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  section: {
    marginBottom: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  resultsDropdown: {
    borderWidth: 1,
    maxHeight: 200,
    overflow: 'hidden',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  gridRow: {
    flexDirection: 'row',
  },
  numInput: {
    borderWidth: 1,
    textAlign: 'center',
    paddingVertical: 12,
  },
  textInput: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
