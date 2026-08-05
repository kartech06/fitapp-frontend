/**
 * WorkoutGenerateSheet — Bottom sheet for generating an AI workout plan.
 *
 * Fields: goalType, experienceLevel chips, daysPerWeek slider, equipment multi-select.
 * Calls generateWorkoutPlan → refreshes the parent on success.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../shared/hooks/useTheme';
import { useAuthStore } from '../../shared/store/authStore';
import { Button } from '../../shared/components/Button';
import {
  generateWorkoutPlan,
  type ExperienceLevel,
  type EquipmentType,
} from '../../shared/api/workout.api';
import { GoalType, GOAL_LABELS, type GoalType as GoalTypeT } from '../../shared/constants';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const EXPERIENCE_LEVELS: { key: ExperienceLevel; label: string; icon: string }[] = [
  { key: 'BEGINNER', label: 'Beginner', icon: 'leaf' },
  { key: 'INTERMEDIATE', label: 'Intermediate', icon: 'barbell' },
  { key: 'ADVANCED', label: 'Advanced', icon: 'trophy' },
];

const EQUIPMENT_OPTIONS: { key: EquipmentType; label: string; icon: string }[] = [
  { key: 'barbell', label: 'Barbell', icon: 'barbell' },
  { key: 'dumbbell', label: 'Dumbbell', icon: 'fitness' },
  { key: 'bodyweight', label: 'Bodyweight', icon: 'body' },
  { key: 'cables', label: 'Cables', icon: 'git-pull-request' },
  { key: 'machines', label: 'Machines', icon: 'hardware-chip' },
];

const GOAL_OPTIONS = Object.entries(GOAL_LABELS) as [GoalTypeT, string][];

interface WorkoutGenerateSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function WorkoutGenerateSheet({ visible, onClose }: WorkoutGenerateSheetProps) {
  const { colors, typography: typo, spacing, borderRadius } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  // Default goal from user's profile (if stored), else GAIN_MUSCLE
  const [goalType, setGoalType] = useState<GoalTypeT>('GAIN_MUSCLE');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('BEGINNER');
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentType[]>([
    'barbell',
    'dumbbell',
  ]);

  const mutation = useMutation({
    mutationFn: () =>
      generateWorkoutPlan({
        goalType,
        experienceLevel,
        daysPerWeek,
        equipment: selectedEquipment,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workoutPlan'] });
      queryClient.invalidateQueries({ queryKey: ['todayWorkout'] });
      onClose();
    },
    onError: (err: any) => {
      console.log('WORKOUT GEN ERROR:', {
        code: err?.code,
        message: err?.message,
        status: err?.response?.status,
        data: err?.response?.data,
      });
    },
  });

  const toggleEquipment = (eq: EquipmentType) => {
    setSelectedEquipment((prev) =>
      prev.includes(eq) ? prev.filter((e) => e !== eq) : [...prev, eq],
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background,
              borderTopLeftRadius: borderRadius.xl,
              borderTopRightRadius: borderRadius.xl,
              paddingBottom: insets.bottom + spacing.lg,
              maxHeight: SCREEN_HEIGHT * 0.85,
            },
          ]}
        >
          {/* Handle bar */}
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>

          {/* Header */}
          <View style={[styles.sheetHeader, { paddingHorizontal: spacing.lg }]}>
            <Text style={[typo.h2, { color: colors.text }]}>Generate Workout Plan</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close" size={24} color={colors.textDim} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}
            showsVerticalScrollIndicator={false}
          >
            {/* GOAL TYPE */}
            <Text style={[typo.label, { color: colors.textDim, marginBottom: spacing.sm, marginTop: spacing.md }]}>
              Goal
            </Text>
            <View style={styles.chipRow}>
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
                        borderRadius: borderRadius.full,
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

            {/* EXPERIENCE LEVEL */}
            <Text style={[typo.label, { color: colors.textDim, marginBottom: spacing.sm, marginTop: spacing.lg }]}>
              Experience Level
            </Text>
            <View style={styles.chipRow}>
              {EXPERIENCE_LEVELS.map(({ key, label, icon }) => {
                const selected = experienceLevel === key;
                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => setExperienceLevel(key)}
                    style={[
                      styles.experienceChip,
                      {
                        backgroundColor: selected ? colors.primary : colors.surface,
                        borderColor: selected ? colors.primary : colors.border,
                        borderRadius: borderRadius.md,
                      },
                    ]}
                  >
                    <Ionicons
                      name={icon as any}
                      size={20}
                      color={selected ? colors.textOnPrimary : colors.textDim}
                      style={{ marginBottom: spacing.xs }}
                    />
                    <Text
                      style={[
                        typo.caption,
                        { color: selected ? colors.textOnPrimary : colors.text },
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* DAYS PER WEEK */}
            <Text style={[typo.label, { color: colors.textDim, marginBottom: spacing.sm, marginTop: spacing.lg }]}>
              Days per Week
            </Text>
            <View style={styles.chipRow}>
              {[3, 4, 5, 6].map((d) => {
                const selected = daysPerWeek === d;
                return (
                  <TouchableOpacity
                    key={d}
                    onPress={() => setDaysPerWeek(d)}
                    style={[
                      styles.dayChip,
                      {
                        backgroundColor: selected ? colors.primary : colors.surface,
                        borderColor: selected ? colors.primary : colors.border,
                        borderRadius: borderRadius.full,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        typo.h3,
                        { color: selected ? colors.textOnPrimary : colors.text },
                      ]}
                    >
                      {d}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* EQUIPMENT */}
            <Text style={[typo.label, { color: colors.textDim, marginBottom: spacing.sm, marginTop: spacing.lg }]}>
              Available Equipment
            </Text>
            <View style={styles.chipRow}>
              {EQUIPMENT_OPTIONS.map(({ key, label, icon }) => {
                const selected = selectedEquipment.includes(key);
                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => toggleEquipment(key)}
                    style={[
                      styles.equipmentChip,
                      {
                        backgroundColor: selected ? colors.primary : colors.surface,
                        borderColor: selected ? colors.primary : colors.border,
                        borderRadius: borderRadius.md,
                      },
                    ]}
                  >
                    <Ionicons
                      name={icon as any}
                      size={18}
                      color={selected ? colors.textOnPrimary : colors.textDim}
                    />
                    <Text
                      style={[
                        typo.buttonSmall,
                        {
                          color: selected ? colors.textOnPrimary : colors.text,
                          marginLeft: spacing.xs,
                        },
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ERROR */}
            {mutation.isError && (
              <View
                style={[
                  styles.errorBox,
                  {
                    backgroundColor: `${colors.error}18`,
                    borderRadius: borderRadius.md,
                    padding: spacing.sm,
                    marginTop: spacing.md,
                  },
                ]}
              >
                <Text style={[typo.bodySmall, { color: colors.error }]}>
                  {(mutation.error as any)?.response?.data?.message ||
                    'Something went wrong. Please try again.'}
                </Text>
              </View>
            )}

            {/* GENERATE BUTTON */}
            <Button
              title={mutation.isPending ? 'Generating your plan…' : 'Generate Plan ✦'}
              onPress={() => mutation.mutate()}
              loading={mutation.isPending}
              disabled={selectedEquipment.length === 0}
              style={{ marginTop: spacing.xl }}
            />
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
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
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
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
  },
  experienceChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderWidth: 1,
    minWidth: 90,
  },
  dayChip: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  equipmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },
  errorBox: {},
});
