/**
 * FitApp Typography System
 *
 * Uses system fonts by default. If a custom font is needed later,
 * update `fontFamily` here and load via `expo-font`.
 */

export interface TextStyle {
  fontSize: number;
  lineHeight: number;
  fontWeight: '400' | '500' | '600' | '700' | '800';
  letterSpacing?: number;
}

export interface AppTypography {
  h1: TextStyle;
  h2: TextStyle;
  h3: TextStyle;
  body: TextStyle;
  bodySmall: TextStyle;
  caption: TextStyle;
  label: TextStyle;
  buttonLarge: TextStyle;
  buttonSmall: TextStyle;
  number: TextStyle; // For large numeric displays (calorie count, weight)
}

export const typography: AppTypography = {
  h1: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
  },
  bodySmall: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },
  caption: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  buttonLarge: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
  buttonSmall: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  number: {
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '800',
    letterSpacing: -1,
  },
};
