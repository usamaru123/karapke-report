import { createClient } from "@/lib/supabase/server";
import type { ConfidenceLevel, Repertoire, Score, Song } from "@/types/domain";

export type RepertoireStatusFilter = "all" | "over90" | "recent" | "favorite";
export type RepertoireConfidenceFilter = ConfidenceLevel | "any";
export type RepertoireSort =
  | "best_score"
  | "recent"
  | "title"
  | "added"
  | "avg"
  | "count"
  | "growth"
  | "stability";

const SORT_VALUES: readonly RepertoireSort[] = [
  "best_score",
  "recent",
  "title",
  "added",
  "avg",
  "count",
  "growth",
  "stability",
];

export function parseSort(v: string | undefined): RepertoireSort {
  return (SORT_VALUES as readonly string[]).includes(v ?? "")
    ? (v as RepertoireSort)
    : "best_score";
}

const STATUS_VALUES: readonly RepertoireStatusFilter[] = [
  "all",
  "over90",
  "recent",
  "favorite",
];
const CONFIDENCE_VALUES: readonly RepertoireConfidenceFilter[] = [
  "any",
  "unset",
  "wanna_sing",
  "practicing",
  "normal",
  "confident",
  "shelf",
];

export function parseStatusFilter(v: string | undefined): RepertoireStatusFilter {
  return (STATUS_VALUES as readonly string[]).includes(v ?? "")
    ? (v as RepertoireStatusFilter)
    : "all";
}
export function parseConfidenceFilter(
  v: string | undefined,
): RepertoireConfidenceFilter {
  return (CONFIDENCE_VALUES as readonly string[]).includes(v ?? "")
    ? (v as RepertoireConfidenceFilter)
    : "any";
}

export type RepertoireWithMeta = Repertoire & {
  song: Song;
  best_score: number | null;
  last_sung_at: string | null;
  /** Average across all scores for the song. */
  avg_score: number | null;
  /** Total score count (how many times sung). */
  score_count: number;
  /** Population standard deviation of scores. Null when <2 scores. */
  std_score: number | null;
  /** Growth = last - first (chronological). Null when <2 scores. */
  growth_score: number | null;
  /** Most recent up-to-5 total_scores, ordered oldest→newest (for sparkline). */
  recent_scores: number[];
  /** Whole days since `last_sung_at` at query time. Null when never sung. */
  days_since_last_sung: number | null;
};

type RepertoireRow = Repertoire & {
  song: Song | null;
};

export async function getRepertoire(opts?: {
  status?: RepertoireStatusFilter;
  confidence?: RepertoireConfidenceFilter;
  sort?: RepertoireSort;
  search?: string;
}): Promise<RepertoireWithMeta[]> {
  const supabase = await createClient();

  // Apply DB-side narrowings first (indexable). Favorite + confidence combine
  // safely because they hit different columns. status `over90` / `recent` rely
  // on joined scores, so those remain in-memory filters below.
  let query = supabase.from("repertoire").select("*, song:songs(*)");
  if (opts?.status === "favorite") {
    query = query.eq("is_favorite", true);
  }
  if (opts?.confidence && opts.confidence !== "any") {
    query = query.eq("confidence", opts.confidence);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as unknown as RepertoireRow[];
  const withSong = rows.filter(
    (r): r is RepertoireRow & { song: Song } => r.song !== null,
  );

  const songIds = withSong.map((r) => r.song.id);
  // Pull all (song_id, total, sung_at) rows in one shot, then aggregate
  // client-side. Cheaper than N subqueries and we get sparkline + std + growth
  // for free. At 200 scores × 50 songs this is trivial.
  const rowsBySong = new Map<string, Array<{ total: number; sungAt: string }>>();

  if (songIds.length > 0) {
    const { data: scoreRows, error: scoreErr } = await supabase
      .from("scores")
      .select("song_id, total_score, sung_at")
      .in("song_id", songIds)
      .order("sung_at", { ascending: true });
    if (scoreErr) throw scoreErr;
    for (const s of scoreRows ?? []) {
      const list = rowsBySong.get(s.song_id) ?? [];
      list.push({ total: Number(s.total_score), sungAt: s.sung_at });
      rowsBySong.set(s.song_id, list);
    }
  }

  // Snapshot "now" once per request so every row shares the same frame.
  const nowMs = Date.now();
  const enriched: RepertoireWithMeta[] = withSong.map((r) => {
    const rows = rowsBySong.get(r.song.id) ?? [];
    if (rows.length === 0) {
      return {
        ...r,
        best_score: null,
        last_sung_at: null,
        avg_score: null,
        score_count: 0,
        std_score: null,
        growth_score: null,
        recent_scores: [],
        days_since_last_sung: null,
      } as RepertoireWithMeta;
    }
    const totals = rows.map((x) => x.total);
    const best = Math.max(...totals);
    const last = rows[rows.length - 1];
    const avg = totals.reduce((a, b) => a + b, 0) / totals.length;
    const std =
      totals.length >= 2
        ? Math.sqrt(
            totals.reduce((a, v) => a + (v - avg) ** 2, 0) / totals.length,
          )
        : null;
    const growth =
      totals.length >= 2 ? totals[totals.length - 1] - totals[0] : null;
    const recent = totals.slice(-5);
    const daysSince = Math.floor(
      (nowMs - new Date(last.sungAt).getTime()) / 86_400_000,
    );
    return {
      ...r,
      best_score: best,
      last_sung_at: last.sungAt,
      avg_score: avg,
      score_count: totals.length,
      std_score: std,
      growth_score: growth,
      recent_scores: recent,
      days_since_last_sung: daysSince,
    } as RepertoireWithMeta;
  });

  let filtered = enriched;
  if (opts?.status === "over90") {
    filtered = enriched.filter((r) => (r.best_score ?? 0) >= 90);
  } else if (opts?.status === "recent") {
    const threshold = new Date(Date.now() - 30 * 86400 * 1000).toISOString();
    filtered = enriched.filter(
      (r) => !r.last_sung_at || r.last_sung_at < threshold,
    );
  }

  if (opts?.search) {
    const q = opts.search.toLowerCase();
    filtered = filtered.filter(
      (r) =>
        r.song.title.toLowerCase().includes(q) ||
        r.song.artist.toLowerCase().includes(q),
    );
  }

  switch (opts?.sort ?? "best_score") {
    case "best_score":
      filtered.sort((a, b) => (b.best_score ?? 0) - (a.best_score ?? 0));
      break;
    case "recent":
      filtered.sort((a, b) =>
        (b.last_sung_at ?? "").localeCompare(a.last_sung_at ?? ""),
      );
      break;
    case "title":
      filtered.sort((a, b) => a.song.title.localeCompare(b.song.title, "ja"));
      break;
    case "added":
      filtered.sort((a, b) => b.added_at.localeCompare(a.added_at));
      break;
    case "avg":
      filtered.sort((a, b) => (b.avg_score ?? -1) - (a.avg_score ?? -1));
      break;
    case "count":
      filtered.sort((a, b) => b.score_count - a.score_count);
      break;
    case "growth":
      // Null (too few data) sinks to bottom.
      filtered.sort(
        (a, b) =>
          (b.growth_score ?? Number.NEGATIVE_INFINITY) -
          (a.growth_score ?? Number.NEGATIVE_INFINITY),
      );
      break;
    case "stability":
      // Lower std = more stable = ranks higher. Null sinks to bottom.
      filtered.sort(
        (a, b) =>
          (a.std_score ?? Number.POSITIVE_INFINITY) -
          (b.std_score ?? Number.POSITIVE_INFINITY),
      );
      break;
  }

  return filtered;
}

export type RepertoireDetail = {
  repertoire: Repertoire;
  song: Song;
  scores: Score[];
  stats: {
    best: number | null;
    avg: number | null;
    latestScore: number | null;
  };
};

export async function getRepertoireDetail(
  repertoireId: string,
): Promise<RepertoireDetail> {
  const supabase = await createClient();

  const { data: rep, error: repErr } = await supabase
    .from("repertoire")
    .select("*, song:songs(*)")
    .eq("id", repertoireId)
    .single();
  if (repErr) throw repErr;

  const row = rep as unknown as Repertoire & { song: Song | null };
  if (!row.song) throw new Error("Repertoire song not found");

  const { data: scores, error: scoreErr } = await supabase
    .from("scores")
    .select("*")
    .eq("song_id", row.song.id)
    .order("sung_at", { ascending: false });
  if (scoreErr) throw scoreErr;

  const scoreList = (scores ?? []) as Score[];
  const totals = scoreList.map((s) => Number(s.total_score));
  const best = totals.length ? Math.max(...totals) : null;
  const avg = totals.length
    ? totals.reduce((a, t) => a + t, 0) / totals.length
    : null;
  const latest = scoreList[0] ?? null;

  const { song: _s, ...repOnly } = row;
  void _s;

  return {
    repertoire: repOnly as Repertoire,
    song: row.song,
    scores: scoreList,
    stats: {
      best,
      avg,
      latestScore: latest ? Number(latest.total_score) : null,
    },
  };
}
