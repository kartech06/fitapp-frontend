import { api } from './axios';
import { getMealsToday, type MealsTodayResponse } from './meal.api';
import { getWorkoutsToday, type WorkoutsTodayResponse } from './workout.api';

export interface DashboardCalories {
  consumed: number;
  goal: number;
  remaining: number;
}

export interface DashboardMacro {
  consumed: number;
  goal: number;
}

export interface DashboardMacros {
  protein: DashboardMacro;
  carbs: DashboardMacro;
  fat: DashboardMacro;
}

export interface DashboardWater {
  consumed_ml: number;
  goal_ml: number;
}

export interface DashboardWeight {
  latest: number | null;
  change_from_last: number | null;
}

export interface DashboardWorkoutsToday {
  count: number;
  exercises: string[];
}

export interface DashboardResponse {
  calories: DashboardCalories;
  macros: DashboardMacros;
  water: DashboardWater;
  weight: DashboardWeight;
  workouts_today: DashboardWorkoutsToday;
  streak: number;
}

export interface DashboardAggregated {
  dashboard: DashboardResponse;
  meals: MealsTodayResponse;
  workouts: WorkoutsTodayResponse;
}

/**
 * Get the daily dashboard summary, combining the high-level dashboard metrics
 * with the detailed meals and workouts for today.
 */
export async function getDashboardToday(): Promise<DashboardAggregated> {
  const [dashboardReq, mealsReq, workoutsReq] = await Promise.all([
    api.get<DashboardResponse>('/dashboard/today'),
    getMealsToday(),
    getWorkoutsToday(),
  ]);

  return {
    dashboard: dashboardReq.data,
    meals: mealsReq,
    workouts: workoutsReq,
  };
}
