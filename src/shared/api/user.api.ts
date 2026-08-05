/**
 * User API — getMe, updateProfile
 */

import { api } from './axios';
import type { SubscriptionPlan, ActivityLevel, DietPreference, GoalType, Gender } from '../constants';

// ─── Response Types ───

export interface UserGoal {
  userId: string;
  goalType: GoalType;
  targetWeightKg: number;
  timelineWeeks: number;
  tdee: number;
  bmr: number;
  bmi: number;
  calorieGoal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  userId: string;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  dietPreference: DietPreference;
  createdAt: string;
  updatedAt: string;
}

export interface UserSubscription {
  plan: SubscriptionPlan;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  currentPeriodEnd: string | null;
}

export interface GetMeResponse {
  id: string;
  name: string | null;
  email: string;
  dob?: string | null;
  gender?: Gender | null;
  isVerified: boolean;
  createdAt: string;
  profile: UserProfile | null;
  goal: UserGoal | null;
  subscription: UserSubscription | null;
}

// ─── API Functions ───

export async function getMe(): Promise<GetMeResponse> {
  const res = await api.get<GetMeResponse>('/users/me');
  return res.data;
}

export async function updateUser(data: { name?: string; email?: string }): Promise<GetMeResponse> {
  const res = await api.patch<GetMeResponse>('/users/me', data);
  return res.data;
}

export interface UpdateProfileRequest {
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  dietPreference: DietPreference;
  goalType?: GoalType;
  targetWeightKg?: number;
  timelineWeeks?: number;
}

export async function updateProfile(data: UpdateProfileRequest) {
  const res = await api.post('/users/me/profile', data);
  return res.data;
}
