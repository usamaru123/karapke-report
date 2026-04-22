/**
 * Aggregate statistics queries for the home Dashboard and the /stats
 * drill-down page. All queries are RLS-scoped so the caller only sees
 * their own scores.
 */

import { createClient } from "@/lib/supabase/server";

export type MonthlyBucket = {
  /** ISO 8601 date of the 1st of the month, e.g. "2026-04-01". */
  month: string;
  count: number;
  avg: number | null;
  best: number | null;
};

export type MonthlySummary = {
  current: MonthlyBucket;
  previous: MonthlyBucket | null;
  /** 今月から見たデルタ (count / avg / best). null when no prior month. */
  delta: {
    count: number;
    avg: number | null;
    best: number | null;
  } | null;
};

/** Aggregate this-month vs. last-month metrics for the Dashboard. */
export async function getMonthlySummary(): Promise<MonthlySummary> {
  const supabase = await createClient();
  const now = new Date();
  const firstOfThis = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstOfPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const { data: scores, error } = await supabase
    .from("scores")
    .select("sung_at, total_score")
    .gte("sung_at", firstOfPrev.toISOString());
  if (error) throw error;

  const bucket = (month: Date): MonthlyBucket => {
    const start = month.toISOString();
    const end =
      new Date(month.getFullYear(), month.getMonth() + 1, 1).toISOString();
    const rows = (scores ?? []).filter(
      (s) => s.sung_at >= start && s.sung_at < end,
    );
    const totals = rows.map((s) => Number(s.total_score));
    const count = rows.length;
    const avg = totals.length
      ? totals.reduce((a, b) => a + b, 0) / totals.length
      : null;
    const best = totals.length ? Math.max(...totals) : null;
    return {
      month: month.toISOString().slice(0, 10),
      count,
      avg,
      best,
    };
  };

  const current = bucket(firstOfThis);
  const previous = bucket(firstOfPrev);

  const delta =
    previous.count === 0 && current.count === 0
      ? null
      : {
          count: current.count - previous.count,
          avg:
            current.avg !== null && previous.avg !== null
              ? current.avg - previous.avg
              : null,
          best:
            current.best !== null && previous.best !== null
              ? current.best - previous.best
              : null,
        };

  return { current, previous, delta };
}

export type MonthlyTrendPoint = {
  month: string;
  count: number;
  avg: number | null;
};

/** Last 12 months of score counts + average for the /stats trend chart. */
export async function getMonthlyTrend(
  monthsBack = 12,
): Promise<MonthlyTrendPoint[]> {
  const supabase = await createClient();
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1);

  const { data, error } = await supabase
    .from("scores")
    .select("sung_at, total_score")
    .gte("sung_at", start.toISOString());
  if (error) throw error;

  const out: MonthlyTrendPoint[] = [];
  for (let i = 0; i < monthsBack; i++) {
    const m = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1 - i), 1);
    const next = new Date(m.getFullYear(), m.getMonth() + 1, 1);
    const rows = (data ?? []).filter(
      (s) =>
        s.sung_at >= m.toISOString() && s.sung_at < next.toISOString(),
    );
    const totals = rows.map((s) => Number(s.total_score));
    out.push({
      month: m.toISOString().slice(0, 7), // YYYY-MM
      count: rows.length,
      avg: totals.length
        ? totals.reduce((a, b) => a + b, 0) / totals.length
        : null,
    });
  }
  return out;
}

export type KpiTrendPoint = {
  /** YYYY-MM */
  month: string;
  /** Repertoire size snapshot (cumulative; never decreases in practice). */
  repertoireCount: number;
  /** Score rows that month. */
  totalScoreCount: number;
  /** Average of total_score that month, or null when no scores. */
  averageScore: number | null;
  /** Songs that have reached >= 90 at least once up to month end. */
  highScoreSongCount: number;
};

/**
 * Per-month KPI trend for home KPI sparklines. We render tiny 6-point charts
 * under each tile to make deltas legible at a glance.
 *
 * Implementation note: we join scores + repertoire once, then bucket in
 * memory. At a few-hundred rows this is basically free.
 */
export async function getMonthlyKpiTrend(
  monthsBack = 6,
): Promise<KpiTrendPoint[]> {
  const supabase = await createClient();
  const now = new Date();
  const windowStart = new Date(
    now.getFullYear(),
    now.getMonth() - (monthsBack - 1),
    1,
  );

  const [{ data: scores, error: scoresErr }, { data: reps, error: repsErr }] =
    await Promise.all([
      supabase
        .from("scores")
        .select("song_id, sung_at, total_score"),
      supabase.from("repertoire").select("added_at"),
    ]);
  if (scoresErr) throw scoresErr;
  if (repsErr) throw repsErr;

  const scoreRows = (scores ?? []).map((s) => ({
    songId: s.song_id as string,
    sungAt: s.sung_at as string,
    total: Number(s.total_score),
  }));
  const repAddedAt = (reps ?? []).map((r) => r.added_at as string);

  const out: KpiTrendPoint[] = [];
  for (let i = 0; i < monthsBack; i++) {
    const m = new Date(
      windowStart.getFullYear(),
      windowStart.getMonth() + i,
      1,
    );
    const next = new Date(m.getFullYear(), m.getMonth() + 1, 1);
    const mIso = m.toISOString();
    const nextIso = next.toISOString();

    // In-month score rows
    const inMonth = scoreRows.filter(
      (r) => r.sungAt >= mIso && r.sungAt < nextIso,
    );
    const monthAvg = inMonth.length
      ? inMonth.reduce((a, r) => a + r.total, 0) / inMonth.length
      : null;

    // Cumulative repertoire (added on or before month end)
    const repCum = repAddedAt.filter((a) => a < nextIso).length;

    // Songs that have hit 90+ by month end (first-ever 90 per song)
    const bestBySong = new Map<string, number>();
    for (const r of scoreRows) {
      if (r.sungAt >= nextIso) continue;
      const prev = bestBySong.get(r.songId) ?? -Infinity;
      if (r.total > prev) bestBySong.set(r.songId, r.total);
    }
    let highCount = 0;
    for (const v of bestBySong.values()) if (v >= 90) highCount++;

    out.push({
      month: m.toISOString().slice(0, 7),
      repertoireCount: repCum,
      totalScoreCount: inMonth.length,
      averageScore: monthAvg,
      highScoreSongCount: highCount,
    });
  }
  return out;
}

export type SongOrderPoint = {
  /** 1-indexed song position within a session. */
  position: number;
  /** Arithmetic mean of total_score at this position across all sessions. */
  mean: number;
  /** Median total_score, more robust to one-off highs/lows. */
  median: number;
  /** Maximum total_score ever achieved at this position. */
  max: number;
  /** Number of sessions that had a song at this position. */
  sampleSize: number;
};

export type SongOrderPerformance = {
  points: SongOrderPoint[];
  /** Position with highest mean score, min sample size 3. Null if insufficient data. */
  peakPosition: { position: number; mean: number; sampleSize: number } | null;
  /** Total sessions included (≥ minSessionSize songs). */
  includedSessionCount: number;
};

/**
 * Aggregate `total_score` by 1-indexed song position within each session.
 * Answers "at which song into the night am I warmed up?".
 *
 * Sessions with fewer than `minSessionSize` (default 2) songs are skipped —
 * we can't learn about ordering from a single-song session.
 *
 * Positions beyond `maxPosition` (default 10) are dropped so the chart stays
 * readable; long sessions are rare and late-session samples are thin.
 */
export async function getSongOrderPerformance(opts?: {
  minSessionSize?: number;
  maxPosition?: number;
}): Promise<SongOrderPerformance> {
  const minSessionSize = opts?.minSessionSize ?? 2;
  const maxPosition = opts?.maxPosition ?? 10;

  const supabase = await createClient();

  // Pull non-null-session scores. Loose scores (session_id = NULL) can't be
  // ordered, so we skip them rather than fake a position.
  const { data, error } = await supabase
    .from("scores")
    .select("session_id, sung_at, total_score")
    .not("session_id", "is", null)
    .order("session_id", { ascending: true })
    .order("sung_at", { ascending: true });
  if (error) throw error;

  // Group by session, then assign position within session.
  const bySession = new Map<string, { sungAt: string; total: number }[]>();
  for (const r of data ?? []) {
    const sid = r.session_id as string;
    const list = bySession.get(sid) ?? [];
    list.push({ sungAt: r.sung_at as string, total: Number(r.total_score) });
    bySession.set(sid, list);
  }

  const byPosition = new Map<number, number[]>();
  let includedSessionCount = 0;
  for (const [, rows] of bySession) {
    if (rows.length < minSessionSize) continue;
    includedSessionCount++;
    // rows already sorted by sung_at (via ORDER BY above)
    for (let i = 0; i < rows.length && i < maxPosition; i++) {
      const pos = i + 1;
      const bucket = byPosition.get(pos) ?? [];
      bucket.push(rows[i].total);
      byPosition.set(pos, bucket);
    }
  }

  const points: SongOrderPoint[] = [];
  for (let pos = 1; pos <= maxPosition; pos++) {
    const bucket = byPosition.get(pos);
    if (!bucket || bucket.length === 0) continue;
    const sorted = [...bucket].sort((a, b) => a - b);
    const mean = bucket.reduce((a, b) => a + b, 0) / bucket.length;
    // Median: even → avg of middle two, odd → middle.
    const mid = sorted.length >> 1;
    const median =
      sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
    const max = sorted[sorted.length - 1];
    points.push({
      position: pos,
      mean,
      median,
      max,
      sampleSize: bucket.length,
    });
  }

  // Find the sweet-spot position. Require ≥ 3 samples to be meaningful.
  let peak: SongOrderPerformance["peakPosition"] = null;
  for (const p of points) {
    if (p.sampleSize < 3) continue;
    if (!peak || p.mean > peak.mean) {
      peak = { position: p.position, mean: p.mean, sampleSize: p.sampleSize };
    }
  }

  return { points, peakPosition: peak, includedSessionCount };
}

export type TopSong = {
  song_id: string;
  title: string;
  artist: string;
  best: number;
  count: number;
};

/**
 * Top songs by best score. Used both on the home summary (N=3) and the
 * /stats page (N=10).
 */
export async function getTopSongsByBest(
  limit = 10,
): Promise<TopSong[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scores")
    .select("song_id, total_score, song:songs(id, title, artist)");
  if (error) throw error;

  type Row = {
    song_id: string;
    total_score: number | string;
    song: { id: string; title: string; artist: string } | null;
  };
  const rows = (data ?? []) as unknown as Row[];

  const byId = new Map<string, TopSong>();
  for (const r of rows) {
    if (!r.song) continue;
    const total = Number(r.total_score);
    if (!Number.isFinite(total)) continue;
    const prev = byId.get(r.song_id);
    if (prev) {
      prev.count += 1;
      if (total > prev.best) prev.best = total;
    } else {
      byId.set(r.song_id, {
        song_id: r.song_id,
        title: r.song.title,
        artist: r.song.artist,
        best: total,
        count: 1,
      });
    }
  }
  return Array.from(byId.values())
    .sort((a, b) => b.best - a.best)
    .slice(0, limit);
}

export type AxisAverages = {
  pitch: number | null;
  stability: number | null;
  expression: number | null;
  vibrato_longtone: number | null;
  rhythm: number | null;
  /** Samples used to compute the averages. */
  sampleSize: number;
};

/** 5-axis radar averages over the user's entire history. */
export async function getOverallAxisAverages(): Promise<AxisAverages> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scores")
    .select(
      "pitch_score, stability_score, expression_score, vibrato_longtone_score, rhythm_score",
    );
  if (error) throw error;

  const sums = {
    pitch: 0,
    stability: 0,
    expression: 0,
    vibrato_longtone: 0,
    rhythm: 0,
  };
  const counts = {
    pitch: 0,
    stability: 0,
    expression: 0,
    vibrato_longtone: 0,
    rhythm: 0,
  };

  for (const s of data ?? []) {
    if (s.pitch_score !== null) {
      sums.pitch += Number(s.pitch_score);
      counts.pitch++;
    }
    if (s.stability_score !== null) {
      sums.stability += Number(s.stability_score);
      counts.stability++;
    }
    if (s.expression_score !== null) {
      sums.expression += Number(s.expression_score);
      counts.expression++;
    }
    if (s.vibrato_longtone_score !== null) {
      sums.vibrato_longtone += Number(s.vibrato_longtone_score);
      counts.vibrato_longtone++;
    }
    if (s.rhythm_score !== null) {
      sums.rhythm += Number(s.rhythm_score);
      counts.rhythm++;
    }
  }

  return {
    pitch: counts.pitch ? sums.pitch / counts.pitch : null,
    stability: counts.stability ? sums.stability / counts.stability : null,
    expression: counts.expression ? sums.expression / counts.expression : null,
    vibrato_longtone: counts.vibrato_longtone
      ? sums.vibrato_longtone / counts.vibrato_longtone
      : null,
    rhythm: counts.rhythm ? sums.rhythm / counts.rhythm : null,
    sampleSize: data?.length ?? 0,
  };
}
