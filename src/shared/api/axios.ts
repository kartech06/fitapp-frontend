/**
 * Axios Instance — FitApp API Client
 *
 * - Request interceptor: injects Authorization header from authStore
 * - Response interceptor: on 401, attempts token refresh, then retries.
 *   On refresh failure, clears auth (user bounces to login).
 *
 * IMPORTANT: Screens should NEVER handle 401 manually.
 * The interceptor handles it transparently.
 */

import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { API_URL } from '../constants';
import { useAuthStore } from '../store/authStore';

// ─── Create Instance ───

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request Interceptor ───

api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response Interceptor (401 → refresh → retry) ───

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (token) {
      resolve(token);
    } else {
      reject(error);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => {
    if (
      response.data &&
      typeof response.data === 'object' &&
      'success' in response.data &&
      'data' in response.data
    ) {
      const unwrapped = { ...response, data: response.data.data };
      return unwrapped;
    }
    return response;
  },
  async (error: AxiosError) => {
    if (error.response?.status === 400) {
      console.log('400 ERROR on', error.config?.url, JSON.stringify(error.response?.data));
    }
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Only intercept 401s on non-auth endpoints
    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url?.includes('/auth/')
    ) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Queue this request until refresh completes
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = useAuthStore.getState().refreshToken;

      if (!refreshToken) {
        throw new Error('No refresh token');
      }

      // Call refresh endpoint directly (not through this interceptor)
      const { data } = await axios.post(`${API_URL}/auth/refresh`, {
        refreshToken,
      });

      const { accessToken: newAccess, refreshToken: newRefresh } = data;

      // Update tokens in store + SecureStore
      await useAuthStore.getState().setTokens({
        accessToken: newAccess,
        refreshToken: newRefresh,
      });

      processQueue(null, newAccess);

      // Retry original request
      originalRequest.headers.Authorization = `Bearer ${newAccess}`;
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);

      // Refresh failed — clear auth, user goes to login
      await useAuthStore.getState().clearAuth();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
