/**
 * ExerciseDetailModal — Shows exercise details when tapping a card.
 *
 * Displays: name, body part, equipment, sets/reps/weight target,
 * instructional steps, and media placeholder.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Image,
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

  if (!exercise) return null;

  const { exercise: info } = exercise;

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

            {/* Media Section (Images / Video Placeholder) */}
            <View style={{ marginBottom: spacing.lg }}>
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
                Demonstration
              </Text>
              {info.imageUrls && info.imageUrls.length > 0 ? (
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  {info.imageUrls.map((url, idx) => (
                    <Image
                      key={idx}
                      source={{ uri: url }}
                      style={[
                        styles.mediaBox,
                        {
                          backgroundColor: colors.surface,
                          borderRadius: borderRadius.md,
                          borderColor: colors.border,
                          borderWidth: 1,
                        },
                      ]}
                      resizeMode="cover"
                    />
                  ))}
                </View>
              ) : (
                <View
                  style={[
                    styles.mediaPlaceholder,
                    {
                      backgroundColor: colors.surface2,
                      borderRadius: borderRadius.md,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Ionicons name="play-circle-outline" size={48} color={colors.textDim} />
                  <Text style={[typo.bodySmall, { color: colors.textDim, marginTop: spacing.xs }]}>
                    Video demo coming soon
                  </Text>
                </View>
              )}
            </View>

            {/* Instructions Section */}
            <View>
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
                How to do it
              </Text>
              
              {info.instructions && info.instructions.length > 0 ? (
                <View style={{ gap: spacing.md }}>
                  {info.instructions.map((step, idx) => (
                    <View key={idx} style={styles.stepRow}>
                      <View
                        style={[
                          styles.stepNumber,
                          {
                            backgroundColor: colors.surface2,
                            borderRadius: borderRadius.sm,
                          },
                        ]}
                      >
                        <Text style={[typo.caption, { color: colors.text, fontWeight: '700' }]}>
                          {idx + 1}
                        </Text>
                      </View>
                      <Text style={[typo.body, { color: colors.text, flex: 1, lineHeight: 22 }]}>
                        {step.instruction}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View
                  style={[
                    styles.placeholderBox,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      borderRadius: borderRadius.md,
                    },
                  ]}
                >
                  <Ionicons name="document-text-outline" size={24} color={colors.textDim} />
                  <Text style={[typo.body, { color: colors.textDim, marginLeft: spacing.sm }]}>
                    Form instructions coming soon.
                  </Text>
                </View>
              )}
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
  mediaBox: {
    width: 120,
    height: 120,
  },
  mediaPlaceholder: {
    height: 160,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  placeholderBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
  },
});
