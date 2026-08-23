/**
 * Nutrition API — All meal logging, food search, diet plan, and photo recognition endpoints.
 *
 * Three logging methods:
 * 1. Structured (manual) — POST /meals/log-structured
 * 2. Natural language — POST /meals/log-natural (BASIC only)
 * 3. Photo recognition — POST /meal-recognition/analyze + confirm (BASIC only)
 */

import { api } from './axios';
import type { MealType } from '../constants';

// ─── Food Search ───

export interface FoodItem {
  id: string;
  name: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  category: string;
  servingSizes?: {
    unit: string;
    grams: number;
  }[];
}

export interface FoodSearchResponse {
  foods: FoodItem[];
  total: number;
  page: number;
  pageSize: number;
}

export async function searchFoods(
  query: string,
  page: number = 1,
  pageSize: number = 20,
): Promise<FoodSearchResponse> {
  const { data } = await api.get<any>(
    `/foods/search?q=${encodeURIComponent(query)}&page=${page}&pageSize=${pageSize}`,
  );

  console.log('FOOD SEARCH RAW ITEM:', JSON.stringify(
    (data?.foods ?? data?.data ?? data)?.[0]
  ));

  const normalizeItems = (items: any[]): FoodItem[] =>
    items.map((item) => ({
      id: item.id || item.foodId || '',
      name: item.name || 'Unknown Food',
      caloriesPer100g: Number(item.caloriesPer100g ?? item.calories_kcal ?? 0),
      proteinPer100g: Number(item.proteinPer100g ?? item.protein_g ?? 0),
      carbsPer100g: Number(item.carbsPer100g ?? item.carbs_g ?? 0),
      fatPer100g: Number(item.fatPer100g ?? item.fat_g ?? 0),
      category: item.category ?? item.dietType ?? 'General',
      servingSizes: item.servingSizes || [],
    }));

  if (Array.isArray(data)) {
    return {
      foods: normalizeItems(data),
      total: data.length,
      page,
      pageSize,
    };
  }
  if (data && Array.isArray(data.foods)) {
    return {
      ...data,
      foods: normalizeItems(data.foods),
    };
  }
  if (data && Array.isArray(data.data)) {
    return {
      foods: normalizeItems(data.data),
      total: data.data.length,
      page,
      pageSize,
    };
  }
  return {
    foods: [],
    total: 0,
    page,
    pageSize,
  };
}

// ─── Structured Meal Logging ───

export interface StructuredFoodEntry {
  foodName: string;
  quantity: number;
  unit: string; // GRAMS | KATORI | SPOON | PIECE | CUP | GLASS
}

export interface StructuredMealLogRequest {
  mealType: MealType;
  items: StructuredFoodEntry[];
}

export interface ResolvedFoodItem {
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  resolved: boolean;
}

export interface StructuredMealLogResponse {
  id: string;
  mealType: MealType;
  items: ResolvedFoodItem[];
  totals: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  };
  unresolvedCount: number;
}

export async function logStructuredMeal(
  payload: StructuredMealLogRequest,
): Promise<StructuredMealLogResponse> {
  const { data } = await api.post<StructuredMealLogResponse>(
    '/meals/log-structured',
    payload,
  );
  return data;
}

// ─── Natural Language Meal Logging ───

export interface NaturalLanguageLogRequest {
  text: string;
}

export interface LoggedNLItem {
  id: string;
  foodName: string;
  matchedName?: string;
  calories?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  quantity?: number;
  unit?: string;
  matchConfidence?: string;
  resolved?: boolean;
}

export interface UnresolvedNLItem {
  foodName: string;
  quantity: number;
  unit: string;
  ambiguous?: boolean;
  reason?: string;
}

export interface NaturalLanguageLogResponse {
  logged: LoggedNLItem[];
  unresolved: UnresolvedNLItem[];
  ambiguousItems?: any[];
  mealCalories?: number;
  mealTypeUsed?: MealType;
  feedback?: string;
}

export async function logNaturalLanguageMeal(
  payload: NaturalLanguageLogRequest,
): Promise<NaturalLanguageLogResponse> {
  const { data } = await api.post<NaturalLanguageLogResponse>(
    '/meals/log-natural',
    payload,
    { timeout: 30_000 },
  );
  return data;
}

// ─── Photo Recognition ───

export interface RecognizedItem {
  id: string;
  name: string;
  confidence: number; // 0-1
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  category: 'high_confidence' | 'needs_confirmation';
  suggestedServingSize: number;
  suggestedServingUnit: string;
  usedDefaultConversion: boolean;
}

export interface PhotoAnalysisResponse {
  sessionId: string;
  items: RecognizedItem[];
  imageUrl: string;
}

export interface PhotoConfirmRequest {
  sessionId: string;
  mealType: MealType;
  confirmedItems: {
    itemId: string;
    servingSize: number;
    servingUnit: string;
  }[];
}

export interface PhotoConfirmResponse {
  id: string;
  mealType: MealType;
  items: ResolvedFoodItem[];
  totals: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  };
}

export async function analyzePhoto(imageUri: string): Promise<PhotoAnalysisResponse> {
  const formData = new FormData();

  // Build the file entry for multipart upload
  const filename = imageUri.split('/').pop() || 'photo.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';

  formData.append('image', {
    uri: imageUri,
    name: filename,
    type,
  } as unknown as Blob);

  const { data } = await api.post<PhotoAnalysisResponse>(
    '/meal-recognition/analyze',
    formData,
    {
      timeout: 60_000,
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  );
  return data;
}

export async function confirmPhotoMeal(
  payload: PhotoConfirmRequest,
): Promise<PhotoConfirmResponse> {
  const { data } = await api.post<PhotoConfirmResponse>(
    '/meal-recognition/confirm',
    payload,
  );
  return data;
}

// ─── Diet Plan ───

export interface DietPlanMealFood {
  name: string;
  quantity: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface DietPlanMeal {
  mealType: MealType;
  foods: DietPlanMealFood[];
  totalCalories: number;
}

export interface DietPlanToday {
  meals: DietPlanMeal[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

export interface MacroBreakdown {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface DietPlanMealSummary {
  mealType: MealType;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  foodCount: number;
}

export interface DietPlanSummary {
  planId: string;
  targets: MacroBreakdown;
  actual: MacroBreakdown;
  meals: DietPlanMealSummary[];
}

export interface ActiveDietPlanFoodItem {
  id: string;
  mealId: string;
  foodId: string;
  quantityGrams: number;
  isRebalanceSwap: boolean;
  food: {
    name: string;
    dietType: string;
    servingSizeG: number;
    macros?: {
      caloriesKcal: number;
      proteinG: number;
      carbsG: number;
      fatG: number;
    };
  };
}

export interface ActiveDietPlanMeal {
  id: string;
  planId: string;
  mealType: MealType;
  targetCaloriesMin: number;
  targetCaloriesMax: number;
  foods: ActiveDietPlanFoodItem[];
}

export interface ActiveDietPlan {
  id: string;
  userId: string;
  templateId: string;
  goalType: string;
  targetCalories: number;
  targetProteinG: number;
  targetCarbsG: number;
  targetFatG: number;
  foodSourcePref?: string;
  status: string;
  createdAt: string;
  template?: {
    name: string;
    mealsPerDay: number;
    proteinPct: number;
    carbsPct: number;
    fatPct: number;
  };
  meals: ActiveDietPlanMeal[];
}

export interface GenerateDietPlanParams {
  goalType: string;
  dietPreference: string;
  foodSourcePreference?: string;
}

export async function getActiveDietPlan(): Promise<ActiveDietPlan> {
  const { data } = await api.get<ActiveDietPlan>('/diet-plans/active');
  return data;
}

export async function getDietPlanSummary(): Promise<DietPlanSummary> {
  const { data } = await api.get<DietPlanSummary>('/diet-plans/active/summary');
  return data;
}

export async function getDietPlanToday(): Promise<DietPlanToday> {
  const plan = await getActiveDietPlan();
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;

  const meals: DietPlanMeal[] = (plan.meals || []).map((m) => {
    let mealCal = 0;
    const foods: DietPlanMealFood[] = (m.foods || []).map((f) => {
      const macros = f.food.macros;
      const scale = (f.quantityGrams || 100) / 100;
      const cal = Math.round((macros?.caloriesKcal || 0) * scale);
      const p = Math.round((macros?.proteinG || 0) * scale * 10) / 10;
      const c = Math.round((macros?.carbsG || 0) * scale * 10) / 10;
      const fat = Math.round((macros?.fatG || 0) * scale * 10) / 10;
      mealCal += cal;
      totalProtein += p;
      totalCarbs += c;
      totalFat += fat;
      return {
        name: f.food.name,
        quantity: `${f.quantityGrams}g`,
        calories: cal,
        proteinG: p,
        carbsG: c,
        fatG: fat,
      };
    });
    return {
      mealType: m.mealType,
      foods,
      totalCalories: mealCal,
    };
  });

  return {
    meals,
    totalCalories: plan.targetCalories,
    totalProtein: Math.round(totalProtein),
    totalCarbs: Math.round(totalCarbs),
    totalFat: Math.round(totalFat),
  };
}

export async function generateDietPlan(
  params: GenerateDietPlanParams,
): Promise<ActiveDietPlan> {
  const { data } = await api.post<ActiveDietPlan>(
    '/diet-plans/generate',
    params,
    {
      timeout: 60_000, // AI generation — longer than default
    },
  );
  return data;
}

export async function regenerateDietPlan(
  planId: string,
  params: GenerateDietPlanParams,
): Promise<ActiveDietPlan> {
  const { data } = await api.post<ActiveDietPlan>(
    `/diet-plans/${planId}/regenerate`,
    params,
    {
      timeout: 60_000, // AI generation — longer than default
    },
  );
  return data;
}

export async function abandonDietPlan(planId: string): Promise<{ abandoned: boolean }> {
  const { data } = await api.post<{ abandoned: boolean }>(
    `/diet-plans/${planId}/abandon`,
  );
  return data;
}

// ─── Meal Deletion ───

export async function deleteMealLog(id: string): Promise<{ message: string }> {
  const { data } = await api.delete<{ message: string }>(`/meals/${id}`);
  return data;
}
