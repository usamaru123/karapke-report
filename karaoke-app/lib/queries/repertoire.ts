import { createClient } from "@/lib/supabase/server";
import type { ConfidenceLevel, Repertoire, Score, Song } from "@/types/domain";

export type RepertoireStatusFilter = "all" | "over90" | "recent" | "favorite";
export type RepertoireConfidenceFilter = ConfidenceLevel | "any";
export type RepertoireSort = "best_score" | "recent" | "title" | "added";

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
  const statsBySong = new Map<string, { best: number; last: string }>();

  if (songIds.length > 0) {
    const { data: scoreRows, error: scoreErr } = await supabase
      .from("scores")
      .select("song_id, total_score, sung_at")
      .in("song_id", songIds);
    if (scoreErr) throw scoreErr;
    for (const s of scoreRows ?? []) {
      const prev = statsBySong.get(s.song_id);
      const total = Number(s.total_score);
      if (!prev) {
        statsBySong.set(s.song_id, { best: total, last: s.sung_at });
      } else {
        statsBySong.set(s.song_id, {
          best: Math.max(prev.best, total),
          last: prev.last > s.sung_at ? prev.last : s.sung_at,
        });
      }
    }
  }

  const enriched: RepertoireWithMeta[] = withSong.map((r) => {
    const stats = statsBySong.get(r.song.id);
    return {
      ...r,
      best_score: stats?.best ?? null,
      last_sung_at: stats?.last ?? null,
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
  }

  return filtered;
}

export type AddableSong = {
  id: string;
  title: string;
  artist: string;
  scoreCount: number;
  bestScore: number | null;
  inRepertoire: boolean;
};

/**
 * List songs the current user has ever scored, annotated with whether the
 * song is already in their repertoire. Used by P4-05 add-song modal.
 */
export async function getAddableScoredSongs(): Promise<AddableSong[]> {
  const supabase = await createClient();

  const [scoresRes, repRes] = await Promise.all([
    supabase
      .from("scores")
      .select("song_id, total_score, song:songs(id, title, artist)"),
    supabase.from("repertoire").select("song_id"),
  ]);
  if (scoresRes.error) throw scoresRes.error;
  if (repRes.error) throw repRes.error;

  const inRepertoire = new Set(
    (repRes.data ?? []).map((r) => r.song_id),
  );

  type ScoreJoin = {
    song_id: string;
    total_score: number;
    song: { id: string; title: string; artist: string } | null;
  };
  const rows = (scoresRes.data ?? []) as unknown as ScoreJoin[];

  const agg = new Map<string, AddableSong>();
  for (const r of rows) {
    if (!r.song) continue;
    const total = Number(r.total_score);
    const existing = agg.get(r.song_id);
    if (existing) {
      existing.scoreCount += 1;
      if (
        existing.bestScore === null ||
        (Number.isFinite(total) && total > existing.bestScore)
      ) {
        existing.bestScore = total;
      }
    } else {
      agg.set(r.song_id, {
        id: r.song.id,
        title: r.song.title,
        artist: r.song.artist,
        scoreCount: 1,
        bestScore: Number.isFinite(total) ? total : null,
        inRepertoire: inRepertoire.has(r.song_id),
      });
    }
  }

  return Array.from(agg.values()).sort((a, b) => {
    if (a.inRepertoire !== b.inRepertoire) return a.inRepertoire ? 1 : -1;
    return b.scoreCount - a.scoreCount;
  });
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
