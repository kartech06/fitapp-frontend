import Constants from 'expo-constants';

/**
 * FitApp Constants
 *
 * Central place for API URL, enums, plan limits, and serving units.
 * Values match the backend Prisma schema exactly.
 */

// ─── API ───

export const API_URL = __DEV__
  ? `http://${Constants.expoConfig?.hostUri?.split(':')[0] ?? '10.0.2.2'}:3000/api/v1`
  : 'https://api.fitapp.com/api/v1'; // TODO: replace with production URL

if (__DEV__) {
  console.log('🚀 [Dev] Resolved API_URL:', API_URL);
}

// ─── Enums (mirror backend Prisma enums) ───

export const Gender = {
  MALE: 'MALE',
  FEMALE: 'FEMALE',
} as const;
export type Gender = (typeof Gender)[keyof typeof Gender];

export const GoalType = {
  LOSE_WEIGHT: 'LOSE_WEIGHT',
  GAIN_MUSCLE: 'GAIN_MUSCLE',
  LEAN: 'LEAN',
  BULK: 'BULK',
  FITNESS: 'FITNESS',
} as const;
export type GoalType = (typeof GoalType)[keyof typeof GoalType];

export const ActivityLevel = {
  SEDENTARY: 'SEDENTARY',
  LIGHTLY_ACTIVE: 'LIGHTLY_ACTIVE',
  MODERATELY_ACTIVE: 'MODERATELY_ACTIVE',
  VERY_ACTIVE: 'VERY_ACTIVE',
  EXTRA_ACTIVE: 'EXTRA_ACTIVE',
} as const;
export type ActivityLevel = (typeof ActivityLevel)[keyof typeof ActivityLevel];

export const DietPreference = {
  VEG: 'VEG',
  EGG: 'EGG',
  NON_VEG: 'NON_VEG',
} as const;
export type DietPreference = (typeof DietPreference)[keyof typeof DietPreference];

export const MealType = {
  BREAKFAST: 'BREAKFAST',
  LUNCH: 'LUNCH',
  DINNER: 'DINNER',
  SNACK: 'SNACK',
  MID_MORNING_SNACK: 'MID_MORNING_SNACK',
  EVENING_SNACK: 'EVENING_SNACK',
} as const;
export type MealType = (typeof MealType)[keyof typeof MealType];

export const SubscriptionPlan = {
  FREE: 'FREE',
  BASIC: 'BASIC',
} as const;
export type SubscriptionPlan = (typeof SubscriptionPlan)[keyof typeof SubscriptionPlan];

// ─── Human-readable Labels ───

export const GOAL_LABELS: Record<GoalType, string> = {
  LOSE_WEIGHT: 'Lose Weight',
  GAIN_MUSCLE: 'Gain Muscle',
  LEAN: 'Get Lean',
  BULK: 'Bulk Up',
  FITNESS: 'Stay Fit',
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  SEDENTARY: 'Sedentary (desk job)',
  LIGHTLY_ACTIVE: 'Lightly Active (1-2 days/week)',
  MODERATELY_ACTIVE: 'Moderately Active (3-5 days/week)',
  VERY_ACTIVE: 'Very Active (6-7 days/week)',
  EXTRA_ACTIVE: 'Extra Active (athlete)',
};

export const DIET_LABELS: Record<DietPreference, string> = {
  VEG: 'Vegetarian',
  EGG: 'Eggetarian',
  NON_VEG: 'Non-Vegetarian',
};

export const MEAL_LABELS: Record<MealType, string> = {
  BREAKFAST: 'Breakfast',
  LUNCH: 'Lunch',
  DINNER: 'Dinner',
  SNACK: 'Snack',
  MID_MORNING_SNACK: 'Mid-Morning Snack',
  EVENING_SNACK: 'Evening Snack',
};

// ─── Serving Units (for meal logging) ───

export const ServingUnit = {
  GRAMS: 'GRAMS',
  KATORI: 'KATORI',
  SPOON: 'SPOON',
  PIECE: 'PIECE',
  CUP: 'CUP',
  GLASS: 'GLASS',
} as const;
export type ServingUnit = (typeof ServingUnit)[keyof typeof ServingUnit];

export const SERVING_LABELS: Record<ServingUnit, string> = {
  GRAMS: 'grams',
  KATORI: 'katori',
  SPOON: 'spoon',
  PIECE: 'piece',
  CUP: 'cup',
  GLASS: 'glass',
};

// ─── Plan Limits ───

export const PLAN_LIMITS = {
  FREE: {
    photoScans: 5, // Lifetime
    chatMessages: 0,
  },
  BASIC: {
    photoScans: Infinity,
    chatMessages: 20, // Per day
  },
} as const;

// ─── Water Goal ───

export const DEFAULT_WATER_GOAL_ML = 3000;

// ─── Storage Keys ───

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'fitapp_access_token',
  REFRESH_TOKEN: 'fitapp_refresh_token',
  THEME: '@fitapp/theme',
} as const;
