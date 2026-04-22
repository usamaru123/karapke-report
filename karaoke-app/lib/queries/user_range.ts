import { createClient } from "@/lib/supabase/server";

export type UserVocalRange = {
  low: number | null;
  high: number | null;
  sampleSize: number;
};

/**
 * The caller's self-observed vocal range, aggregated from every score they've
 * sung. Returns null bounds when there isn't enough signal (no scores yet, or
 * DAM didn't supply the singing_range columns).
 *
 * We intentionally use the overall min/max across ALL scoring history, not the
 * latest score. Rationale: a single off-day where the singer croaked out a low
 * F shouldn't shrink the reported range next time they pull up the app in a
 * karaoke box. MVP+1 heuristic; revisit with e.g. 5th/95th percentile if the
 * range ends up dragged by outliers once more data lands.
 */
export async function getUserVocalRange(): Promise<UserVocalRange> {
  const supabase = await createClient();
  // RLS scopes rows to auth.uid() automatically.
  const { data, error } = await supabase
    .from("scores")
    .select("singing_range_lowest, singing_range_highest");
  if (error) throw error;

  const rows = (data ?? []) as {
    singing_range_lowest: number | null;
    singing_range_highest: number | null;
  }[];

  let low: number | null = null;
  let high: number | null = null;
  let count = 0;
  for (const r of rows) {
    if (r.singing_range_lowest !== null) {
      if (low === null || r.singing_range_lowest < low) {
        low = r.singing_range_lowest;
      }
      count++;
    }
    if (r.singing_range_highest !== null) {
      if (high === null || r.singing_range_highest > high) {
        high = r.singing_range_highest;
      }
    }
  }

  return { low, high, sampleSize: count };
}
