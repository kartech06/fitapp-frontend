import { api } from './axios';

export interface MealLog {
  id: string;
  userId: string;
  foodId: string | null;
  name: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK' | 'EVENING_SNACK';
  loggedAt: string;
  source: string;
}

export interface MealsTodayResponse {
  meals: {
    BREAKFAST: MealLog[];
    LUNCH: MealLog[];
    DINNER: MealLog[];
    SNACK: MealLog[];
    EVENING_SNACK?: MealLog[];
  };
  totals: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  };
}

export async function getMealsToday(): Promise<MealsTodayResponse> {
  const { data } = await api.get<MealsTodayResponse>('/meals/today');
  return data;
}
