/**
 * Auth Store (Zustand)
 *
 * Manages authentication state: user, tokens, plan.
 * Tokens are persisted to Expo SecureStore.
 * Token refresh is handled by the Axios interceptor, NOT by this store.
 */

import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, type SubscriptionPlan } from '../constants';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  plan: SubscriptionPlan;
  isAuthenticated: boolean;
  isLoading: boolean;     // true while hydrating from SecureStore
  isOnboarded: boolean;   // true if user has completed onboarding
}

interface AuthActions {
  setAuth: (params: {
    user: AuthUser;
    accessToken: string;
    refreshToken: string;
  }) => Promise<void>;
  setTokens: (params: {
    accessToken: string;
    refreshToken: string;
  }) => Promise<void>;
  setPlan: (plan: SubscriptionPlan) => void;
  setOnboarded: (value: boolean) => Promise<void>;
  clearAuth: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState & AuthActions>()((set, get) => ({
  // ─── State ───
  user: null,
  accessToken: null,
  refreshToken: null,
  plan: 'FREE',
  isAuthenticated: false,
  isLoading: true,
  isOnboarded: false,

  // ─── Actions ───

  setAuth: async ({ user, accessToken, refreshToken }) => {
    await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);

    set({
      user,
      accessToken,
      refreshToken,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  setTokens: async ({ accessToken, refreshToken }) => {
    await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);

    set({ accessToken, refreshToken });
  },

  setPlan: (plan) => {
    set({ plan });
  },

  setOnboarded: async (value) => {
    set({ isOnboarded: value });
    await AsyncStorage.setItem('isOnboarded', JSON.stringify(value));
  },

  clearAuth: async () => {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
    await AsyncStorage.removeItem('isOnboarded');

    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      plan: 'FREE',
      isAuthenticated: false,
      isLoading: false,
      isOnboarded: false,
    });
  },

  hydrate: async () => {
    try {
      const [accessToken, refreshToken, storedOnboarded] = await Promise.all([
        SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN),
        SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN),
        AsyncStorage.getItem('isOnboarded'),
      ]);

      // Parse with JSON.parse to match the JSON.stringify(value) used by setOnboarded.
      // If the key was removed (clearAuth) or never set, storedOnboarded is null → false.
      let isOnboarded = false;
      if (storedOnboarded !== null) {
        try {
          isOnboarded = JSON.parse(storedOnboarded) === true;
        } catch {
          isOnboarded = false;
        }
      }

      if (accessToken && refreshToken) {
        set({
          accessToken,
          refreshToken,
          isAuthenticated: true,
          isOnboarded,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch {
      // SecureStore can fail on first launch or corrupted state
      set({ isLoading: false });
    }
  },
}));
