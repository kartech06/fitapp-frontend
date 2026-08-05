/**
 * Onboarding API — submit onboarding data, get summary
 */

import { api } from './axios';
import type { Gender, GoalType, ActivityLevel, DietPreference } from '../constants';

// ─── Request Types ───

export interface OnboardingRequest {
  heightCm: number;
  weightKg: number;
  dob: string;        // ISO date string e.g. "1998-05-15"
  gender: Gender;
  activityLevel: ActivityLevel;
  goalType: GoalType;
  dietPreference: DietPreference;
  timelineWeeks?: number;
}

// ─── Response Types ───

export interface OnboardingResponse {
  bmi: { value: number; classification: string };
  bmr: number;
  tdee: number;
  targetCalories: number;
  macros: {
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  optimalWeight: {
    kg: number;
    difference_kg: number;
  };
  estimatedWeeksToGoal: number;
}

// ─── API Functions ───

export async function submitOnboarding(
  data: OnboardingRequest,
): Promise<OnboardingResponse> {
  const res = await api.post<OnboardingResponse>('/onboarding', data);
  return res.data;
}

export async function getOnboardingSummary(): Promise<OnboardingResponse> {
  const res = await api.get<OnboardingResponse>('/onboarding/summary');
  return res.data;
}
