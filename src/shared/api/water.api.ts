import { api } from './axios';

export interface CreateWaterLogRequest {
  amountMl: number;
  loggedAt?: string;
}

export interface WaterLogResponse {
  id: string;
  userId: string;
  amountMl: number;
  loggedAt: string;
}

export interface WaterTodayResponse {
  consumed_ml: number;
  goal_ml: number;
}

/**
 * Log water consumption.
 */
export async function logWater(payload: CreateWaterLogRequest): Promise<WaterLogResponse> {
  const { data } = await api.post<WaterLogResponse>('/water', payload);
  return data;
}

/**
 * Get today's water summary.
 */
export async function getWaterToday(): Promise<WaterTodayResponse> {
  const { data } = await api.get<WaterTodayResponse>('/water/today');
  return data;
}
