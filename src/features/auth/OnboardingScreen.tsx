/**
 * OnboardingScreen — 6-step onboarding flow.
 *
 * Steps:
 *  0 — Basic info (height, weight, DOB, gender)
 *  1 — Goal selection
 *  2 — Activity level
 *  3 — Diet preference
 *  4 — Timeline (weeks)
 *  5 — Results (BMI, TDEE, macros in AIPanel)
 *
 * Uses onboardingStore to accumulate data across steps.
 * Step 5 calls POST /onboarding with all collected data.
 */

import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useQueryClient } from '@tanstack/react-query';
import { useTheme, type Theme } from '../../shared/hooks/useTheme';
import { usePlan } from '../../shared/hooks/usePlan';
import { useAuthStore } from '../../shared/store/authStore';
import { useOnboardingStore, type OnboardingData } from '../../shared/store/onboardingStore';
import { Button } from '../../shared/components/Button';
import { AIPanel } from '../../shared/components/AIPanel';
import { MacroBar } from '../../shared/components/MacroBar';
import { submitOnboarding, type OnboardingResponse } from '../../shared/api/onboarding.api';
import type { Gender, GoalType, ActivityLevel, DietPreference } from '../../shared/constants';
import {
  GOAL_LABELS,
  ACTIVITY_LABELS,
  DIET_LABELS,
} from '../../shared/constants';
import { formatCalories } from '../../shared/utils/format';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TOTAL_STEPS = 6;

// ─── Goal icons & descriptions ───
const GOAL_OPTIONS: Array<{
  value: GoalType;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
}> = [
  { value: 'LOSE_WEIGHT', icon: 'trending-down', description: 'Reduce body fat while preserving muscle' },
  { value: 'GAIN_MUSCLE', icon: 'barbell', description: 'Build lean muscle mass with surplus calories' },
  { value: 'LEAN', icon: 'body', description: 'Get lean and defined with a slight deficit' },
  { value: 'BULK', icon: 'arrow-up-circle', description: 'Maximize muscle growth with higher calories' },
  { value: 'FITNESS', icon: 'fitness', description: 'Maintain current weight, improve overall fitness' },
];

const ACTIVITY_OPTIONS: Array<{
  value: ActivityLevel;
  description: string;
}> = [
  { value: 'SEDENTARY', description: 'Desk job, little or no exercise' },
  { value: 'LIGHTLY_ACTIVE', description: 'Light exercise 1-2 days/week' },
  { value: 'MODERATELY_ACTIVE', description: 'Moderate exercise 3-5 days/week' },
  { value: 'VERY_ACTIVE', description: 'Hard exercise 6-7 days/week' },
  { value: 'EXTRA_ACTIVE', description: 'Very hard exercise, physical job, or training 2x/day' },
];

const DIET_OPTIONS: Array<{
  value: DietPreference;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
}> = [
  { value: 'VEG', icon: 'leaf', description: 'Plant-based, no meat or eggs' },
  { value: 'EGG', icon: 'egg', description: 'Vegetarian + eggs' },
  { value: 'NON_VEG', icon: 'restaurant', description: 'All food groups including meat' },
];

export interface OnboardingFlowProps {
  isEditMode?: boolean;
  initialData?: Partial<OnboardingData>;
  onFinish?: () => void;
  onCancel?: () => void;
}

export function OnboardingScreen() {
  return <OnboardingFlow />;
}

export function OnboardingFlow({
  isEditMode = false,
  initialData,
  onFinish,
  onCancel,
}: OnboardingFlowProps = {}) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const insets = useSafeAreaInsets();
  const { isFree } = usePlan();
  const { step, data, updateData, nextStep, prevStep, reset } = useOnboardingStore();
  const queryClient = useQueryClient();

  const slideAnim = useRef(new Animated.Value(0)).current;
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<OnboardingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditMode && initialData) {
      updateData(initialData);
    }
  }, [isEditMode]);

  const animateToStep = (targetStep: number) => {
    Animated.spring(slideAnim, {
      toValue: -targetStep * SCREEN_WIDTH,
      useNativeDriver: true,
      tension: 60,
      friction: 12,
    }).start();
  };

  const handleNext = () => {
    nextStep();
    animateToStep(step + 1);
  };

  const handleBack = () => {
    prevStep();
    animateToStep(step - 1);
  };

  const handleSubmitOnboarding = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await submitOnboarding({
        heightCm: data.heightCm!,
        weightKg: data.weightKg!,
        dob: data.dob!,
        gender: data.gender!,
        activityLevel: data.activityLevel!,
        goalType: data.goalType!,
        dietPreference: data.dietPreference!,
        timelineWeeks: data.timelineWeeks ?? undefined,
      });

      setResults(res);
      nextStep();
      animateToStep(5);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to process your data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    if (onFinish) {
      onFinish();
    } else {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      useAuthStore.getState().setOnboarded(true);
      reset();
    }
  };

  // Validate per step
  const canContinue = (): boolean => {
    switch (step) {
      case 0:
        return data.gender !== null && data.dob !== null && data.heightCm !== null && data.weightKg !== null;
      case 1:
        return data.goalType !== null;
      case 2:
        return data.activityLevel !== null;
      case 3:
        return data.dietPreference !== null;
      case 4:
        return true; // timeline is optional
      default:
        return true;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Progress bar */}
      <View
        style={{
          paddingTop: insets.top + spacing.sm,
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.md,
        }}
      >
        <View style={styles.progressRow}>
          {step === 0 && isEditMode && (
            <TouchableOpacity
              onPress={() => {
                reset();
                onCancel?.();
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ marginRight: spacing.ms }}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          )}
          {step > 0 && step < 5 && (
            <TouchableOpacity
              onPress={handleBack}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ marginRight: spacing.ms }}
            >
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </TouchableOpacity>
          )}
          <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: colors.primary,
                  width: `${((step + 1) / TOTAL_STEPS) * 100}%`,
                },
              ]}
            />
          </View>
          <Text
            style={[
              theme.typography.caption,
              { color: colors.textDim, marginLeft: spacing.ms, minWidth: 36 },
            ]}
          >
            {step + 1}/{TOTAL_STEPS}
          </Text>
        </View>
      </View>

      {/* Animated step container */}
      <Animated.View
        style={[
          styles.stepsContainer,
          { transform: [{ translateX: slideAnim }] },
        ]}
      >
        <StepBasicInfo data={data} updateData={updateData} theme={theme} />
        <StepGoal data={data} updateData={updateData} theme={theme} />
        <StepActivity data={data} updateData={updateData} theme={theme} />
        <StepDiet data={data} updateData={updateData} theme={theme} />
        <StepTimeline data={data} updateData={updateData} theme={theme} />
        <StepResults results={results} theme={theme} isFree={isFree} />
      </Animated.View>

      {/* Bottom button */}
      <View
        style={{
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + spacing.md,
          paddingTop: spacing.sm,
        }}
      >
        {error && (
          <Text
            style={[
              theme.typography.bodySmall,
              { color: colors.error, textAlign: 'center', marginBottom: spacing.sm },
            ]}
          >
            {error}
          </Text>
        )}

        {step < 4 && (
          <Button
            title="Continue"
            onPress={handleNext}
            disabled={!canContinue()}
          />
        )}
        {step === 4 && (
          <Button
            title="Calculate My Plan"
            onPress={handleSubmitOnboarding}
            loading={loading}
            disabled={!canContinue()}
          />
        )}
        {step === 5 && (
          <Button
            title={isEditMode ? "Save Goals & Return" : "Let's Go!"}
            onPress={handleFinish}
          />
        )}
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════
// Step 0 — Basic Info (height, weight, DOB, gender)
// ═══════════════════════════════════════════════════════

function StepBasicInfo({
  data,
  updateData,
  theme,
}: {
  data: OnboardingData;
  updateData: (p: Partial<OnboardingData>) => void;
  theme: Theme;
}) {
  const { colors, typography: typo, spacing, borderRadius } = theme;

  return (
    <ScrollView
      style={styles.step}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[typo.h2, { color: colors.text, marginBottom: spacing.xs }]}>
        Let's get to know you
      </Text>
      <Text style={[typo.body, { color: colors.textDim, marginBottom: spacing.xl }]}>
        We'll use this to calculate your fitness plan
      </Text>

      {/* Gender */}
      <Text style={[typo.label, { color: colors.textDim, marginBottom: spacing.sm }]}>
        Gender
      </Text>
      <View style={[styles.chipRow, { marginBottom: spacing.lg }]}>
        {(['MALE', 'FEMALE'] as Gender[]).map((g) => (
          <TouchableOpacity
            key={g}
            style={[
              styles.chip,
              {
                backgroundColor: data.gender === g ? colors.primary : colors.surface,
                borderColor: data.gender === g ? colors.primary : colors.border,
                borderRadius: borderRadius.md,
                paddingVertical: spacing.ms,
                paddingHorizontal: spacing.lg,
                marginRight: spacing.sm,
              },
            ]}
            onPress={() => updateData({ gender: g })}
            activeOpacity={0.7}
          >
            <Ionicons
              name={g === 'MALE' ? 'male' : 'female'}
              size={20}
              color={data.gender === g ? colors.textOnPrimary : colors.text}
            />
            <Text
              style={[
                typo.buttonSmall,
                {
                  color: data.gender === g ? colors.textOnPrimary : colors.text,
                  marginLeft: spacing.sm,
                },
              ]}
            >
              {g === 'MALE' ? 'Male' : 'Female'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Date of Birth */}
      <Text style={[typo.label, { color: colors.textDim, marginBottom: spacing.sm }]}>
        Date of Birth
      </Text>
      <TextInput
        style={[
          styles.textInput,
          {
            backgroundColor: colors.surface2,
            borderColor: colors.border,
            borderRadius: borderRadius.md,
            color: colors.text,
            ...typo.body,
            marginBottom: spacing.lg,
          },
        ]}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={colors.textDim}
        value={data.dob ?? ''}
        onChangeText={(text) => updateData({ dob: text })}
        keyboardType="numbers-and-punctuation"
      />

      {/* Height */}
      <Text style={[typo.label, { color: colors.textDim, marginBottom: spacing.sm }]}>
        Height (cm)
      </Text>
      <TextInput
        style={[
          styles.textInput,
          {
            backgroundColor: colors.surface2,
            borderColor: colors.border,
            borderRadius: borderRadius.md,
            color: colors.text,
            ...typo.body,
            marginBottom: spacing.lg,
          },
        ]}
        placeholder="170"
        placeholderTextColor={colors.textDim}
        value={data.heightCm?.toString() ?? ''}
        onChangeText={(text) => {
          const n = parseFloat(text);
          updateData({ heightCm: isNaN(n) ? null : n });
        }}
        keyboardType="numeric"
      />

      {/* Weight */}
      <Text style={[typo.label, { color: colors.textDim, marginBottom: spacing.sm }]}>
        Weight (kg)
      </Text>
      <TextInput
        style={[
          styles.textInput,
          {
            backgroundColor: colors.surface2,
            borderColor: colors.border,
            borderRadius: borderRadius.md,
            color: colors.text,
            ...typo.body,
            marginBottom: spacing.md,
          },
        ]}
        placeholder="70"
        placeholderTextColor={colors.textDim}
        value={data.weightKg?.toString() ?? ''}
        onChangeText={(text) => {
          const n = parseFloat(text);
          updateData({ weightKg: isNaN(n) ? null : n });
        }}
        keyboardType="numeric"
      />
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════
// Step 1 — Goal Selection
// ═══════════════════════════════════════════════════════

function StepGoal({
  data,
  updateData,
  theme,
}: {
  data: OnboardingData;
  updateData: (p: Partial<OnboardingData>) => void;
  theme: Theme;
}) {
  const { colors, typography: typo, spacing, borderRadius } = theme;

  return (
    <ScrollView
      style={styles.step}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
    >
      <Text style={[typo.h2, { color: colors.text, marginBottom: spacing.xs }]}>
        What's your goal?
      </Text>
      <Text style={[typo.body, { color: colors.textDim, marginBottom: spacing.xl }]}>
        We'll tailor your calories and macros to match
      </Text>

      {GOAL_OPTIONS.map((opt) => {
        const selected = data.goalType === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.optionCard,
              {
                backgroundColor: selected ? `${colors.primary}18` : colors.surface,
                borderColor: selected ? colors.primary : colors.border,
                borderRadius: borderRadius.lg,
                padding: spacing.md,
                marginBottom: spacing.sm,
              },
            ]}
            onPress={() => updateData({ goalType: opt.value })}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.optionIcon,
                {
                  backgroundColor: selected ? colors.primary : colors.surface2,
                  borderRadius: borderRadius.md,
                },
              ]}
            >
              <Ionicons
                name={opt.icon}
                size={22}
                color={selected ? colors.textOnPrimary : colors.text}
              />
            </View>
            <View style={styles.optionText}>
              <Text
                style={[
                  typo.buttonSmall,
                  { color: selected ? colors.primary : colors.text },
                ]}
              >
                {GOAL_LABELS[opt.value]}
              </Text>
              <Text style={[typo.caption, { color: colors.textDim, marginTop: 2 }]}>
                {opt.description}
              </Text>
            </View>
            {selected && (
              <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════
// Step 2 — Activity Level
// ═══════════════════════════════════════════════════════

function StepActivity({
  data,
  updateData,
  theme,
}: {
  data: OnboardingData;
  updateData: (p: Partial<OnboardingData>) => void;
  theme: Theme;
}) {
  const { colors, typography: typo, spacing, borderRadius } = theme;

  return (
    <ScrollView
      style={styles.step}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
    >
      <Text style={[typo.h2, { color: colors.text, marginBottom: spacing.xs }]}>
        How active are you?
      </Text>
      <Text style={[typo.body, { color: colors.textDim, marginBottom: spacing.xl }]}>
        This helps us calculate your daily calorie needs
      </Text>

      {ACTIVITY_OPTIONS.map((opt) => {
        const selected = data.activityLevel === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.optionCard,
              {
                backgroundColor: selected ? `${colors.primary}18` : colors.surface,
                borderColor: selected ? colors.primary : colors.border,
                borderRadius: borderRadius.lg,
                padding: spacing.md,
                marginBottom: spacing.sm,
              },
            ]}
            onPress={() => updateData({ activityLevel: opt.value })}
            activeOpacity={0.7}
          >
            <View style={styles.optionText}>
              <Text
                style={[
                  typo.buttonSmall,
                  { color: selected ? colors.primary : colors.text },
                ]}
              >
                {ACTIVITY_LABELS[opt.value]}
              </Text>
              <Text style={[typo.caption, { color: colors.textDim, marginTop: 2 }]}>
                {opt.description}
              </Text>
            </View>
            {selected && (
              <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════
// Step 3 — Diet Preference
// ═══════════════════════════════════════════════════════

function StepDiet({
  data,
  updateData,
  theme,
}: {
  data: OnboardingData;
  updateData: (p: Partial<OnboardingData>) => void;
  theme: Theme;
}) {
  const { colors, typography: typo, spacing, borderRadius } = theme;

  return (
    <ScrollView
      style={styles.step}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
    >
      <Text style={[typo.h2, { color: colors.text, marginBottom: spacing.xs }]}>
        Diet preference
      </Text>
      <Text style={[typo.body, { color: colors.textDim, marginBottom: spacing.xl }]}>
        We'll suggest foods you actually eat
      </Text>

      {DIET_OPTIONS.map((opt) => {
        const selected = data.dietPreference === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.optionCard,
              {
                backgroundColor: selected ? `${colors.primary}18` : colors.surface,
                borderColor: selected ? colors.primary : colors.border,
                borderRadius: borderRadius.lg,
                padding: spacing.md,
                marginBottom: spacing.sm,
              },
            ]}
            onPress={() => updateData({ dietPreference: opt.value })}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.optionIcon,
                {
                  backgroundColor: selected ? colors.primary : colors.surface2,
                  borderRadius: borderRadius.md,
                },
              ]}
            >
              <Ionicons
                name={opt.icon}
                size={22}
                color={selected ? colors.textOnPrimary : colors.text}
              />
            </View>
            <View style={styles.optionText}>
              <Text
                style={[
                  typo.buttonSmall,
                  { color: selected ? colors.primary : colors.text },
                ]}
              >
                {DIET_LABELS[opt.value]}
              </Text>
              <Text style={[typo.caption, { color: colors.textDim, marginTop: 2 }]}>
                {opt.description}
              </Text>
            </View>
            {selected && (
              <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════
// Step 4 — Timeline
// ═══════════════════════════════════════════════════════

function StepTimeline({
  data,
  updateData,
  theme,
}: {
  data: OnboardingData;
  updateData: (p: Partial<OnboardingData>) => void;
  theme: Theme;
}) {
  const { colors, typography: typo, spacing, borderRadius } = theme;
  const weeks = data.timelineWeeks ?? 12;

  const presets = [4, 8, 12, 16, 24, 52];

  return (
    <ScrollView
      style={styles.step}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
    >
      <Text style={[typo.h2, { color: colors.text, marginBottom: spacing.xs }]}>
        Your timeline
      </Text>
      <Text style={[typo.body, { color: colors.textDim, marginBottom: spacing.xl }]}>
        How many weeks do you want to achieve your goal in?
      </Text>

      {/* Big number display */}
      <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
        <Text style={[typo.number, { color: colors.primary, fontSize: 64 }]}>
          {weeks}
        </Text>
        <Text style={[typo.body, { color: colors.textDim }]}>weeks</Text>
      </View>

      {/* Preset chips */}
      <View style={[styles.chipRow, { flexWrap: 'wrap', justifyContent: 'center' }]}>
        {presets.map((w) => (
          <TouchableOpacity
            key={w}
            style={[
              styles.chip,
              {
                backgroundColor: weeks === w ? colors.primary : colors.surface,
                borderColor: weeks === w ? colors.primary : colors.border,
                borderRadius: borderRadius.full,
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.md,
                margin: spacing.xs,
              },
            ]}
            onPress={() => updateData({ timelineWeeks: w })}
            activeOpacity={0.7}
          >
            <Text
              style={[
                typo.buttonSmall,
                { color: weeks === w ? colors.textOnPrimary : colors.text },
              ]}
            >
              {w}w
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Custom input */}
      <View style={{ alignItems: 'center', marginTop: spacing.lg }}>
        <Text style={[typo.caption, { color: colors.textDim, marginBottom: spacing.sm }]}>
          Or enter custom weeks (4-52)
        </Text>
        <TextInput
          style={[
            styles.textInput,
            {
              backgroundColor: colors.surface2,
              borderColor: colors.border,
              borderRadius: borderRadius.md,
              color: colors.text,
              ...typo.body,
              width: 100,
              textAlign: 'center',
            },
          ]}
          placeholder="12"
          placeholderTextColor={colors.textDim}
          value={weeks.toString()}
          onChangeText={(text) => {
            const n = parseInt(text, 10);
            if (!isNaN(n) && n >= 4 && n <= 52) {
              updateData({ timelineWeeks: n });
            } else if (text === '') {
              updateData({ timelineWeeks: null });
            }
          }}
          keyboardType="number-pad"
        />
      </View>
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════
// Step 5 — Results
// ═══════════════════════════════════════════════════════

function StepResults({
  results,
  theme,
  isFree,
}: {
  results: OnboardingResponse | null;
  theme: Theme;
  isFree: boolean;
}) {
  const { colors, typography: typo, spacing, borderRadius } = theme;

  if (!results) {
    return <View style={styles.step} />;
  }

  return (
    <ScrollView
      style={styles.step}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
    >
      <Text style={[typo.h2, { color: colors.text, marginBottom: spacing.xs }]}>
        Your personalized plan
      </Text>
      <Text style={[typo.body, { color: colors.textDim, marginBottom: spacing.lg }]}>
        Here's what we calculated based on your profile
      </Text>

      <AIPanel label="AI Analysis" style={{ marginBottom: spacing.md }}>
        {/* BMI */}
        <View style={[styles.resultRow, { marginBottom: spacing.ms }]}>
          <Text style={[typo.label, { color: colors.aiText }]}>BMI</Text>
          <Text style={[typo.body, { color: colors.text }]}>
            {results.bmi.value.toFixed(1)} — {results.bmi.classification}
          </Text>
        </View>

        {/* TDEE */}
        <View style={[styles.resultRow, { marginBottom: spacing.ms }]}>
          <Text style={[typo.label, { color: colors.aiText }]}>Daily Energy (TDEE)</Text>
          <Text style={[typo.body, { color: colors.text }]}>
            {formatCalories(results.tdee)} kcal
          </Text>
        </View>

        {/* Target Calories */}
        <View style={[styles.resultRow, { marginBottom: spacing.ms }]}>
          <Text style={[typo.label, { color: colors.aiText }]}>Target Calories</Text>
          <Text style={[typo.h3, { color: colors.primary }]}>
            {formatCalories(results.targetCalories)} kcal/day
          </Text>
        </View>

        {/* Optimal Weight */}
        <View style={[styles.resultRow, { marginBottom: spacing.md }]}>
          <Text style={[typo.label, { color: colors.aiText }]}>Target Weight</Text>
          <Text style={[typo.body, { color: colors.text }]}>
            {results.optimalWeight.kg.toFixed(1)} kg (
            {results.optimalWeight.difference_kg > 0 ? '+' : ''}
            {results.optimalWeight.difference_kg.toFixed(1)} kg)
          </Text>
        </View>

        {/* Timeline */}
        <View style={[styles.resultRow, { marginBottom: spacing.md }]}>
          <Text style={[typo.label, { color: colors.aiText }]}>Estimated Timeline</Text>
          <Text style={[typo.body, { color: colors.text }]}>
            {results.estimatedWeeksToGoal} weeks
          </Text>
        </View>

        {/* Macros */}
        <Text
          style={[
            typo.label,
            { color: colors.aiText, marginBottom: spacing.sm },
          ]}
        >
          Daily Macros
        </Text>
        <MacroBar
          protein={{
            consumed: Math.round(results.macros.protein_g),
            goal: Math.round(results.macros.protein_g),
          }}
          carbs={{
            consumed: Math.round(results.macros.carbs_g),
            goal: Math.round(results.macros.carbs_g),
          }}
          fat={{
            consumed: Math.round(results.macros.fat_g),
            goal: Math.round(results.macros.fat_g),
          }}
          height={12}
        />
        <View style={[styles.macroNumbers, { marginTop: spacing.sm }]}>
          <Text style={[typo.bodySmall, { color: colors.text }]}>
            🥩 {Math.round(results.macros.protein_g)}g protein
          </Text>
          <Text style={[typo.bodySmall, { color: colors.text }]}>
            🍚 {Math.round(results.macros.carbs_g)}g carbs
          </Text>
          <Text style={[typo.bodySmall, { color: colors.text }]}>
            🥑 {Math.round(results.macros.fat_g)}g fat
          </Text>
        </View>
      </AIPanel>

      {/* FREE plan upsell */}
      {isFree && (
        <View
          style={[
            styles.upsell,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: borderRadius.lg,
              padding: spacing.md,
              marginTop: spacing.sm,
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
            Upgrade to Basic to unlock AI workout plans, diet plans, meal recognition,
            and more.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: { flex: 1 },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  stepsContainer: {
    flexDirection: 'row',
    flex: 1,
  },
  step: {
    width: SCREEN_WIDTH,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  textInput: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  optionIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionText: {
    flex: 1,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  macroNumbers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  upsell: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
});
