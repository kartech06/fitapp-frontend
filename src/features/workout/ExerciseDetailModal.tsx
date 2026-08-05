/**
 * ExerciseDetailModal — Shows exercise details when tapping a card.
 *
 * Displays: name, body part, equipment, sets/reps/weight target,
 * and per-set "Mark as done" toggles.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../shared/hooks/useTheme';
import type { PlanExercise } from '../../shared/api/workout.api';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ExerciseDetailModalProps {
  exercise: PlanExercise | null;
  onClose: () => void;
  currentWeek: number;
}

export function ExerciseDetailModal({
  exercise,
  onClose,
  currentWeek,
}: ExerciseDetailModalProps) {
  const { colors, typography: typo, spacing, borderRadius } = useTheme();
  const insets = useSafeAreaInsets();

  // Track which sets are marked done
  const [completedSets, setCompletedSets] = useState<boolean[]>([]);

  // Reset when exercise changes
  useEffect(() => {
    if (exercise) {
      setCompletedSets(new Array(exercise.sets).fill(false));
    }
  }, [exercise]);

  if (!exercise) return null;

  const { exercise: info } = exercise;
  const allDone = completedSets.every(Boolean);
  const doneCount = completedSets.filter(Boolean).length;

  const toggleSet = (index: number) => {
    setCompletedSets((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  return (
    <Modal
      visible={!!exercise}
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
              maxHeight: SCREEN_HEIGHT * 0.8,
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
          >
            {/* Header */}
            <View style={[styles.headerRow, { marginBottom: spacing.md }]}>
              <View style={{ flex: 1 }}>
                <Text style={[typo.h2, { color: colors.text }]}>
                  {info.name}
                </Text>
                <View style={[styles.metaRow, { marginTop: spacing.xs }]}>
                  {info.equipment && (
                    <View
                      style={[
                        styles.metaChip,
                        {
                          backgroundColor: colors.surface2,
                          borderRadius: borderRadius.sm,
                        },
                      ]}
                    >
                      <Ionicons
                        name="barbell-outline"
                        size={12}
                        color={colors.textDim}
                      />
                      <Text
                        style={[
                          typo.caption,
                          { color: colors.textDim, marginLeft: 4 },
                        ]}
                      >
                        {info.equipment}
                      </Text>
                    </View>
                  )}
                  {info.primaryMuscles.map((m) => (
                    <View
                      key={m}
                      style={[
                        styles.metaChip,
                        {
                          backgroundColor: colors.surface2,
                          borderRadius: borderRadius.sm,
                        },
                      ]}
                    >
                      <Text style={[typo.caption, { color: colors.textDim }]}>
                        {m}
                      </Text>
                    </View>
                  ))}
                  {info.mechanic && (
                    <View
                      style={[
                        styles.metaChip,
                        {
                          backgroundColor: colors.surface2,
                          borderRadius: borderRadius.sm,
                        },
                      ]}
                    >
                      <Text style={[typo.caption, { color: colors.textDim }]}>
                        {info.mechanic}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={24} color={colors.textDim} />
              </TouchableOpacity>
            </View>

            {/* Target Info Card */}
            <View
              style={[
                styles.targetCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: borderRadius.lg,
                  padding: spacing.md,
                  marginBottom: spacing.lg,
                },
              ]}
            >
              <Text
                style={[
                  typo.label,
                  {
                    color: colors.textDim,
                    marginBottom: spacing.sm,
                    textTransform: 'uppercase',
                  },
                ]}
              >
                Week {currentWeek} Target
              </Text>
              <View style={styles.targetRow}>
                <View style={styles.targetItem}>
                  <Text style={[typo.number, { color: colors.primary }]}>
                    {exercise.sets}
                  </Text>
                  <Text style={[typo.caption, { color: colors.textDim }]}>
                    Sets
                  </Text>
                </View>
                <View style={[styles.targetDivider, { backgroundColor: colors.border }]} />
                <View style={styles.targetItem}>
                  <Text style={[typo.number, { color: colors.primary }]}>
                    {exercise.reps}
                  </Text>
                  <Text style={[typo.caption, { color: colors.textDim }]}>
                    Reps
                  </Text>
                </View>
                <View style={[styles.targetDivider, { backgroundColor: colors.border }]} />
                <View style={styles.targetItem}>
                  <Text style={[typo.number, { color: colors.primary }]}>
                    {exercise.targetWeightKg ?? '—'}
                  </Text>
                  <Text style={[typo.caption, { color: colors.textDim }]}>
                    kg
                  </Text>
                </View>
              </View>
            </View>

            {/* Set Tracking */}
            <Text
              style={[
                typo.label,
                {
                  color: colors.textDim,
                  marginBottom: spacing.sm,
                  textTransform: 'uppercase',
                },
              ]}
            >
              Sets — {doneCount}/{exercise.sets} done
            </Text>

            {completedSets.map((done, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => toggleSet(i)}
                style={[
                  styles.setRow,
                  {
                    backgroundColor: done ? `${colors.primary}18` : colors.surface,
                    borderColor: done ? colors.primary : colors.border,
                    borderRadius: borderRadius.md,
                    marginBottom: spacing.sm,
                    padding: spacing.ms,
                  },
                ]}
                activeOpacity={0.7}
              >
                <View style={styles.setLeft}>
                  <View
                    style={[
                      styles.setCircle,
                      {
                        backgroundColor: done
                          ? colors.primary
                          : 'transparent',
                        borderColor: done ? colors.primary : colors.border,
                        borderRadius: 12,
                      },
                    ]}
                  >
                    {done && (
                      <Ionicons
                        name="checkmark"
                        size={14}
                        color={colors.textOnPrimary}
                      />
                    )}
                  </View>
                  <Text
                    style={[
                      typo.body,
                      {
                        color: done ? colors.primary : colors.text,
                        marginLeft: spacing.sm,
                        fontWeight: '600',
                      },
                    ]}
                  >
                    Set {i + 1}
                  </Text>
                </View>
                <Text style={[typo.bodySmall, { color: colors.textDim }]}>
                  {exercise.reps} reps
                  {exercise.targetWeightKg ? ` @ ${exercise.targetWeightKg}kg` : ''}
                </Text>
              </TouchableOpacity>
            ))}

            {/* All Done Message */}
            {allDone && exercise.sets > 0 && (
              <View
                style={[
                  styles.allDoneBox,
                  {
                    backgroundColor: `${colors.success}18`,
                    borderRadius: borderRadius.md,
                    padding: spacing.md,
                    marginTop: spacing.sm,
                  },
                ]}
              >
                <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                <Text
                  style={[
                    typo.body,
                    {
                      color: colors.success,
                      fontWeight: '600',
                      marginLeft: spacing.sm,
                    },
                  ]}
                >
                  Exercise complete! 🎉
                </Text>
              </View>
            )}
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
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {},
  handleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  targetCard: {
    borderWidth: 1,
  },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  targetItem: {
    alignItems: 'center',
  },
  targetDivider: {
    width: 1,
    height: 40,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  setLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  setCircle: {
    width: 24,
    height: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allDoneBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
