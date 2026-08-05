/**
 * FitApp Spacing & Border Radius System
 */

export const spacing = {
  /** 4px — tight inline spacing */
  xs: 4,
  /** 8px — compact element gaps */
  sm: 8,
  /** 12px — small padding */
  ms: 12,
  /** 16px — standard content padding */
  md: 16,
  /** 24px — section gaps */
  lg: 24,
  /** 32px — large section breaks */
  xl: 32,
  /** 48px — hero / top-level spacing */
  xxl: 48,
} as const;

export const borderRadius = {
  /** 6px — small elements (badges, tags) */
  sm: 6,
  /** 10px — inputs, small cards */
  md: 10,
  /** 14px — standard cards */
  lg: 14,
  /** 20px — AI panels, prominent cards */
  xl: 20,
  /** 9999px — pills, fully rounded */
  full: 9999,
} as const;

export type Spacing = typeof spacing;
export type BorderRadius = typeof borderRadius;
