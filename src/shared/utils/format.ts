/**
 * Shared utility for formatting calorie values consistently across the frontend.
 * Rounds to nearest integer and formats with locale separators (e.g. "1,390").
 */
export function formatCalories(value?: number | null): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '0';
  }
  return Math.round(value).toLocaleString();
}
