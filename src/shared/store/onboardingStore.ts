/**
 * Onboarding Store (Zustand)
 *
 * Manages the multi-step onboarding flow data.
 * Fields mirror the backend OnboardingDto exactly.
 *
 * Steps:
 *  0 — Gender
 *  1 — Date of Birth
 *  2 — Height & Weight
 *  3 — Activity Level
 *  4 — Fitness Goal
 *  5 — Diet Preference
 */

import { create } from 'zustand';
import type { Gender, GoalType, ActivityLevel, DietPreference } from '../constants';

export interface OnboardingData {
  gender: Gender | null;
  dob: string | null;           // ISO date string
  heightCm: number | null;
  weightKg: number | null;
  activityLevel: ActivityLevel | null;
  goalType: GoalType | null;
  dietPreference: DietPreference | null;
  timelineWeeks: number | null;
}

interface OnboardingState {
  step: number;
  data: OnboardingData;
}

interface OnboardingActions {
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateData: (partial: Partial<OnboardingData>) => void;
  reset: () => void;
}

const INITIAL_DATA: OnboardingData = {
  gender: null,
  dob: null,
  heightCm: null,
  weightKg: null,
  activityLevel: null,
  goalType: null,
  dietPreference: null,
  timelineWeeks: null,
};

export const useOnboardingStore = create<OnboardingState & OnboardingActions>()(
  (set) => ({
    step: 0,
    data: { ...INITIAL_DATA },

    setStep: (step) => set({ step }),
    nextStep: () => set((s) => ({ step: Math.min(s.step + 1, 5) })),
    prevStep: () => set((s) => ({ step: Math.max(s.step - 1, 0) })),

    updateData: (partial) =>
      set((s) => ({ data: { ...s.data, ...partial } })),

    reset: () => set({ step: 0, data: { ...INITIAL_DATA } }),
  }),
);
