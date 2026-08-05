/**
 * useTheme — the single source of truth for styled components.
 *
 * Returns { colors, typography, spacing, borderRadius, dark }.
 * Every component must use this hook. Never import color hex values directly.
 */

import { useMemo } from 'react';
import { useThemeStore } from '../store/themeStore';
import { darkColors, lightColors, type AppColors } from '../theme/colors';
import { typography, type AppTypography } from '../theme/typography';
import { spacing, borderRadius, type Spacing, type BorderRadius } from '../theme/spacing';

export interface Theme {
  dark: boolean;
  colors: AppColors;
  typography: AppTypography;
  spacing: Spacing;
  borderRadius: BorderRadius;
}

export function useTheme(): Theme {
  const isDark = useThemeStore((s) => s.isDark);

  return useMemo(
    () => ({
      dark: isDark,
      colors: isDark ? darkColors : lightColors,
      typography,
      spacing,
      borderRadius,
    }),
    [isDark],
  );
}
