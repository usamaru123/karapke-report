/**
 * Robust statistics helpers for the advice engine.
 *
 * Motivation: single-score rules (R01-R14) originally took the **latest**
 * score as input. That made the advice swing wildly whenever the user had
 * one outlier session. Aggregating over the recent N scores with outlier
 * rejection gives a steadier signal that reflects "どこが慢性的に課題か".
 *
 * All functions here are pure — same input → same output, no I/O.
 * Empty input arrays yield null (callers handle it as "no signal").
 */

/** Trim the top and bottom ~quartile before averaging. */
export function trimmedMean(values: number[]): number | null {
  const clean = values.filter((v) => Number.isFinite(v));
  if (clean.length === 0) return null;
  if (clean.length <= 2) {
    return clean.reduce((s, v) => s + v, 0) / clean.length;
  }
  const sorted = [...clean].sort((a, b) => a - b);
  // For N values, drop floor(N/4) from each end. N=5 → drop 1+1, keep middle 3.
  const drop = Math.floor(sorted.length / 4);
  const kept = sorted.slice(drop, sorted.length - drop);
  if (kept.length === 0) {
    // Fallback to median when trim collapses the set (N=3 edge case already
    // handled above, but defensive).
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }
  return kept.reduce((s, v) => s + v, 0) / kept.length;
}

/** Median: resistant to single extreme outliers. */
export function median(values: number[]): number | null {
  const clean = values.filter((v) => Number.isFinite(v));
  if (clean.length === 0) return null;
  const sorted = [...clean].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Pick the N newest elements (caller supplies the full list). No side effect
 * on input; returned array is a fresh slice.
 */
export function takeRecent<T>(
  arr: T[],
  n: number,
  timestamp: (t: T) => string,
): T[] {
  if (arr.length <= n) return [...arr];
  return [...arr]
    .sort((a, b) => timestamp(b).localeCompare(timestamp(a)))
    .slice(0, n);
}
