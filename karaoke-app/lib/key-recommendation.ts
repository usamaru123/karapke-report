/**
 * Recommend a preferred_key for a song based on the user's own scoring history.
 *
 * Input: every score row for the target song.
 * Output: for each distinct key_control observed, an aggregate { count, best,
 * avg }. The top pick is the key whose avg is highest among keys with at
 * least MIN_SAMPLES uses; ties broken by higher best then higher count.
 *
 * We cannot recommend from a single-sample key — one lucky run isn't enough
 * signal. In those cases we still surface the per-key breakdown so the user
 * can see what they've tried, but flag the recommendation as insufficient.
 */

export type ScoreInput = {
  key_control: number;
  total_score: number | string | null;
};

export type KeyStat = {
  key: number;
  count: number;
  best: number;
  avg: number;
};

export type KeyRecommendation =
  | {
      kind: "none";
      reason: "no_scores" | "insufficient_samples";
      stats: KeyStat[];
    }
  | {
      kind: "recommended";
      bestKey: number;
      best: KeyStat;
      /** Every distinct key the user has tried, sorted by avg desc. */
      stats: KeyStat[];
    };

const MIN_SAMPLES_PER_KEY = 2;

export function recommendKey(
  scores: ScoreInput[],
): KeyRecommendation {
  if (scores.length === 0) {
    return { kind: "none", reason: "no_scores", stats: [] };
  }

  // Aggregate per-key stats.
  const byKey = new Map<
    number,
    { count: number; best: number; sum: number }
  >();
  for (const s of scores) {
    const total =
      typeof s.total_score === "number"
        ? s.total_score
        : s.total_score !== null
          ? Number(s.total_score)
          : NaN;
    if (!Number.isFinite(total)) continue;
    const prev = byKey.get(s.key_control);
    if (prev) {
      prev.count += 1;
      prev.sum += total;
      if (total > prev.best) prev.best = total;
    } else {
      byKey.set(s.key_control, { count: 1, best: total, sum: total });
    }
  }

  const stats: KeyStat[] = Array.from(byKey.entries())
    .map(([key, v]) => ({
      key,
      count: v.count,
      best: v.best,
      avg: v.sum / v.count,
    }))
    .sort(
      (a, b) =>
        b.avg - a.avg ||
        b.best - a.best ||
        b.count - a.count ||
        a.key - b.key,
    );

  // Qualified = at least MIN_SAMPLES_PER_KEY samples at that key.
  const qualified = stats.filter((s) => s.count >= MIN_SAMPLES_PER_KEY);
  if (qualified.length === 0) {
    return { kind: "none", reason: "insufficient_samples", stats };
  }

  return {
    kind: "recommended",
    bestKey: qualified[0].key,
    best: qualified[0],
    stats,
  };
}

export function formatKeyDelta(delta: number): string {
  if (delta === 0) return "原キー";
  return delta > 0 ? `+${delta}` : `${delta}`;
}
