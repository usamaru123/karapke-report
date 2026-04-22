/**
 * Pure utilities for turning `YYYY-MM` URL params into Date windows and back.
 * Kept out of lib/queries/stats.ts so client components (MonthPicker) can
 * import them without dragging the Supabase server client into the browser
 * bundle.
 */

/**
 * Parse a "YYYY-MM" string into the [first-of-month, first-of-next-month)
 * half-open window. Returns null for bad input so callers can fall back.
 */
export function parseMonthKey(
  key: string | undefined,
): { year: number; month: number; start: Date; end: Date } | null {
  if (!key) return null;
  const m = key.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return { year, month, start, end };
}

/** Format a Date as "YYYY-MM" (server-local). */
export function toMonthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
