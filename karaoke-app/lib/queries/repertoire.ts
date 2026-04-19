import { createClient } from "@/lib/supabase/server";
import type { Repertoire, Score, Song } from "@/types/domain";

export type RepertoireFilter = "all" | "over90" | "recent" | "favorite";
export type RepertoireSort = "best_score" | "recent" | "title" | "added";

export type RepertoireWithMeta = Repertoire & {
  song: Song;
  best_score: number | null;
  last_sung_at: string | null;
};

type RepertoireRow = Repertoire & {
  song: Song | null;
};

export async function getRepertoire(opts?: {
  filter?: RepertoireFilter;
  sort?: RepertoireSort;
  search?: string;
}): Promise<RepertoireWithMeta[]> {
  const supabase = await createClient();

  // `repertoire` has no direct FK to `scores` (both link to `songs`).
  // Fetch repertoire with its song, then aggregate per-song score stats separately.
  let query = supabase.from("repertoire").select("*, song:songs(*)");

  if (opts?.filter === "favorite") {
    query = query.eq("is_favorite", true);
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
  if (opts?.filter === "over90") {
    filtered = enriched.filter((r) => (r.best_score ?? 0) >= 90);
  } else if (opts?.filter === "recent") {
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
