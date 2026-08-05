/**
 * FitApp Theme — Barrel Export
 */

export { darkColors, lightColors } from './colors';
export type { AppColors } from './colors';
export { typography } from './typography';
export type { AppTypography, TextStyle } from './typography';
export { spacing, borderRadius } from './spacing';
export type { Spacing, BorderRadius } from './spacing';

export interface AppTheme {
  dark: boolean;
  colors: import('./colors').AppColors;
  typography: import('./typography').AppTypography;
  spacing: typeof import('./spacing').spacing;
  borderRadius: typeof import('./spacing').borderRadius;
}
