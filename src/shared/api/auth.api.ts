/**
 * Auth API — login, register, refresh, logout
 */

import { api } from './axios';
import type { AuthUser } from '../store/authStore';

// ─── Request Types ───

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name?: string;
  email: string;
  password: string;
}

export interface ResetPasswordRequest {
  code: string;
  newPassword: string;
}

// ─── Response Types ───

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

// ─── API Functions ───

export async function login(data: LoginRequest): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/auth/login', data);
  return res.data;
}

export async function register(data: RegisterRequest): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/auth/register', data);
  return res.data;
}

export async function refreshToken(token: string): Promise<TokenResponse> {
  const res = await api.post<TokenResponse>('/auth/refresh', {
    refreshToken: token,
  });
  return res.data;
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}

export async function forgotPassword(email: string): Promise<void> {
  await api.post('/auth/forgot-password', { email });
}

export async function resetPassword(data: ResetPasswordRequest): Promise<void> {
  await api.post('/auth/reset-password', data);
}
