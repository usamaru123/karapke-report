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
