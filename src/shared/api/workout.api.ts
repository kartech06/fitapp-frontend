import { api } from './axios';

// ─── Workout Log Types (existing) ───

export interface WorkoutLog {
  id: string;
  userId: string;
  workoutPlanId: string | null;
  exerciseName: string;
  sets: number;
  reps: number;
  weightKg: number | null;
  durationMin: number | null;
  caloriesBurned: number | null;
  loggedAt: string;
  source: string;
}

export interface WorkoutsTodayResponse {
  workouts: WorkoutLog[];
  count: number;
  totalSets: number;
  totalCaloriesBurned: number;
}

export async function getWorkoutsToday(): Promise<WorkoutsTodayResponse> {
  const { data } = await api.get<WorkoutsTodayResponse>('/workouts/today');
  return data;
}

// ─── Workout Plan Types ───

export type ExperienceLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export type EquipmentType =
  | 'barbell'
  | 'dumbbell'
  | 'bodyweight'
  | 'cables'
  | 'machines';

export interface GenerateWorkoutPlanParams {
  goalType: string;
  experienceLevel: ExperienceLevel;
  daysPerWeek: number;
  equipment: EquipmentType[];
}

export interface PlanExerciseInfo {
  name: string;
  equipment: string;
  primaryMuscles: string[];
  mechanic: string | null;
  imageUrls?: string[];
  instructions?: { instruction: string }[];
}

export interface PlanExercise {
  id: string;
  planDayId: string;
  exerciseId: string;
  slotOrder: number;
  sets: number;
  reps: number;
  targetWeightKg: number | null;
  isAutoSubstituted: boolean;
  exercise: PlanExerciseInfo;
  completedToday?: boolean;
  actualExerciseName?: string;
}

export interface PlanDay {
  id: string;
  planId: string;
  dayIndex: number;
  dayName: string;
  weekNumber: number;
  exercises: PlanExercise[];
}

export interface PlanTemplate {
  name: string;
  splitType: string;
  daysPerWeek: number;
}

export interface WorkoutPlan {
  id: string;
  userId: string;
  templateId: string;
  goalType: string;
  currentWeek: number;
  status: 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
  createdAt: string;
  template: PlanTemplate;
  days: PlanDay[];
}

export interface MissedDay {
  dayIndex: number;
  dayName: string;
  date: string;
}

export interface TodayWorkoutResponse {
  isRestDay: boolean;
  message?: string;
  // When not a rest day, includes day data:
  id?: string;
  dayIndex?: number;
  dayName?: string;
  weekNumber?: number;
  exercises?: PlanExercise[];
  isCompletedToday?: boolean;
  
  missedDays?: MissedDay[];
  overrideDay?: {
    id: string;
    dayIndex: number;
    dayName: string;
    weekNumber: number;
    exercises: PlanExercise[];
    isCompletedToday?: boolean;
  };
}

export interface CompleteWeekResponse {
  message: string;
  currentWeek: number;
  isDeload: boolean;
  completionSummary?: {
    totalDays: number;
    completedDays: number;
    missedDays: number;
  };
}

export interface AbandonResponse {
  abandoned: boolean;
}

// ─── API Functions ───

/**
 * Generate a new AI workout plan.
 * Requires BASIC subscription.
 */
export async function generateWorkoutPlan(
  params: GenerateWorkoutPlanParams,
): Promise<WorkoutPlan> {
  const { data } = await api.post<WorkoutPlan>(
    '/workout-plans/generate',
    params,
    {
      timeout: 60_000,
    },
  );
  return data;
}

/**
 * Get the current active workout plan with all days/exercises.
 */
export async function getActivePlan(): Promise<WorkoutPlan> {
  const { data } = await api.get<WorkoutPlan>('/workout-plans/active');
  return data;
}

/**
 * Get today's workout from the active plan.
 */
export async function getTodayWorkout(): Promise<TodayWorkoutResponse> {
  const { data } = await api.get<TodayWorkoutResponse>(
    '/workout-plans/active/today',
  );
  return data;
}

/**
 * Complete the current week and advance with progressive overload.
 */
export async function completeWeek(
  planId: string,
): Promise<CompleteWeekResponse> {
  const { data } = await api.post<CompleteWeekResponse>(
    `/workout-plans/${planId}/complete-week`,
  );
  return data;
}

export interface RecoverMissedDayRequest {
  missedDayIndex: number;
  action: 'DO_TODAY' | 'SKIP';
}

/**
 * Recover a missed day (either do it today or skip it).
 */
export async function recoverMissedDay(
  planId: string,
  payload: RecoverMissedDayRequest
): Promise<{ message: string }> {
  const { data } = await api.post<{ message: string }>(
    `/workout-plans/${planId}/recover-missed-day`,
    payload
  );
  return data;
}

/**
 * Abandon the current plan.
 */
export async function abandonPlan(planId: string): Promise<AbandonResponse> {
  const { data } = await api.post<AbandonResponse>(
    `/workout-plans/${planId}/abandon`,
  );
  return data;
}

// ─── Workout Logging & History ───

export interface CreateWorkoutLogRequest {
  exerciseId?: string;
  exerciseName: string;
  sets: number;
  reps: number;
  weightKg?: number;
  durationMins?: number;
  loggedAt?: string;
  notes?: string;
  planExerciseId?: string;
  substitutedFromExerciseId?: string;
}

export interface ExerciseMaster {
  id: string;
  name: string;
  category: string;
  level: string;
  primaryMuscles: string[];
  secondaryMuscles?: string[];
  equipment: string;
  mechanic?: string | null;
  force?: string | null;
}

export interface ExerciseSearchResponse {
  exercises: ExerciseMaster[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Log a workout session for a single exercise.
 */
export async function logWorkout(
  payload: CreateWorkoutLogRequest,
): Promise<WorkoutLog> {
  const { data } = await api.post<WorkoutLog>('/workouts', payload);
  return data;
}

/**
 * Get workout logs history.
 */
export async function getWorkoutHistory(
  days: number = 30,
): Promise<WorkoutLog[]> {
  const { data } = await api.get<WorkoutLog[]>(`/workouts/history?days=${days}`);
  return data;
}

/**
 * Delete a workout log by ID.
 */
export async function deleteWorkoutLog(
  id: string,
): Promise<{ message: string }> {
  const { data } = await api.delete<{ message: string }>(`/workouts/${id}`);
  return data;
}

/**
 * Search exercises from the knowledge base.
 */
export async function searchExercises(
  query: string,
  page: number = 1,
  pageSize: number = 20,
): Promise<ExerciseSearchResponse> {
  const { data } = await api.get<ExerciseSearchResponse>(
    `/exercises?query=${encodeURIComponent(query)}&page=${page}&pageSize=${pageSize}`,
  );
  return data;
}
