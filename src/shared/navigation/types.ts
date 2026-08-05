/**
 * Navigation Types — Type-safe route params for all navigators.
 */

import type { NavigatorScreenParams } from '@react-navigation/native';

// ─── Root ───

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Onboarding: undefined;
  App: NavigatorScreenParams<AppTabParamList>;
  WorkoutLog?: {
    plannedExercises?: {
      id?: string;
      exerciseId?: string;
      name: string;
      sets: number;
      reps: number;
      weightKg?: number | null;
    }[];
  };
  WorkoutHistory: undefined;
  DietPlan: undefined;
  EditGoals: undefined;
  EditProfile: undefined;
  Subscription: undefined;
};

// ─── Auth Stack ───

export type AuthStackParamList = {
  Splash: undefined;
  Login: undefined;
  Register: undefined;
  Onboarding: undefined;
};

// ─── App Tab Navigator ───

export type AppTabParamList = {
  Today: undefined;
  Workout: undefined;
  Nutrition: undefined;
  Coach: undefined;
  Profile: undefined;
};

// ─── Utility: Typed navigation prop helpers ───

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
