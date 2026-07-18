/**
 * FitApp Color System
 *
 * KEY DESIGN RULE:
 * - Human-logged data → uses `surface` cards with `border` dividers
 * - AI-generated content → uses AIPanel with `ai*` colors (violet-tinted)
 *
 * Never import colors directly — always use the `useTheme()` hook.
 */

export interface AppColors {
  // Backgrounds
  background: string;
  surface: string;
  surface2: string;

  // Brand
  primary: string;       // Lime — progress rings, actions, today pill
  primaryDark: string;   // Darker variant for pressed states
  secondary: string;     // Violet — ONLY for AI-generated content
  error: string;         // Coral — streaks, warnings, destructive

  // Text
  text: string;
  textDim: string;
  textOnPrimary: string; // Text color when placed on primary bg

  // Borders
  border: string;

  // AI Panel specific (violet-tinted)
  aiBackground: string;
  aiBorder: string;
  aiText: string;

  // Semantic
  success: string;
  warning: string;

  // Tab bar
  tabBar: string;
  tabInactive: string;
}

export const darkColors: AppColors = {
  background: '#0B0E11',
  surface: '#14181C',
  surface2: '#1B2126',

  primary: '#C8F031',
  primaryDark: '#A5C828',
  secondary: '#7B61FF',
  error: '#FF6B5C',

  text: '#F2F2EA',
  textDim: '#8A8F98',
  textOnPrimary: '#0B0E11',

  border: '#262C31',

  aiBackground: '#2A2447',
  aiBorder: '#3D3470',
  aiText: '#D4CFFF',

  success: '#4ADE80',
  warning: '#FBBF24',

  tabBar: '#14181C',
  tabInactive: '#8A8F98',
};

export const lightColors: AppColors = {
  background: '#F5F5F0',
  surface: '#FFFFFF',
  surface2: '#F0F0EB',

  primary: '#6B8E00',
  primaryDark: '#567200',
  secondary: '#5B41E0',
  error: '#D94F40',

  text: '#0B0E11',
  textDim: '#5B6066',
  textOnPrimary: '#FFFFFF',

  border: '#E0E0DA',

  aiBackground: '#EEEBFF',
  aiBorder: '#D4CFEF',
  aiText: '#3D3470',

  success: '#16A34A',
  warning: '#D97706',

  tabBar: '#FFFFFF',
  tabInactive: '#5B6066',
};
