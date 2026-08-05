/**
 * Theme Store (Zustand)
 *
 * Persists the user's dark/light preference to AsyncStorage.
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants';

interface ThemeState {
  isDark: boolean;
  isHydrated: boolean;
}

interface ThemeActions {
  toggle: () => void;
  hydrate: () => Promise<void>;
}

export const useThemeStore = create<ThemeState & ThemeActions>()((set, get) => ({
  isDark: true, // Dark theme is default
  isHydrated: false,

  toggle: () => {
    const next = !get().isDark;
    set({ isDark: next });
    AsyncStorage.setItem(STORAGE_KEYS.THEME, JSON.stringify(next)).catch(() => {
      // Silently fail — theme is cosmetic
    });
  },

  hydrate: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.THEME);
      if (stored !== null) {
        set({ isDark: JSON.parse(stored), isHydrated: true });
      } else {
        set({ isHydrated: true });
      }
    } catch {
      set({ isHydrated: true });
    }
  },
}));
