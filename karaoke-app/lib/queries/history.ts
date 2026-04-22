import { createClient } from "@/lib/supabase/server";
import type { Score, Session } from "@/types/domain";

export type HistoryRange = "all" | "over90" | "over80" | "under80";
export type HistorySort =
  | "recent"
  | "oldest"
  | "score_desc"
  | "score_asc";

const RANGE_VALUES: readonly HistoryRange[] = [
  "all",
  "over90",
  "over80",
  "under80",
];
const SORT_VALUES: readonly HistorySort[] = [
  "recent",
  "oldest",
  "score_desc",
  "score_asc",
];

export function parseHistoryRange(v: string | undefined): HistoryRange {
  return (RANGE_VALUES as readonly string[]).includes(v ?? "")
    ? (v as HistoryRange)
    : "all";
}
export function parseHistorySort(v: string | undefined): HistorySort {
  return (SORT_VALUES as readonly string[]).includes(v ?? "")
    ? (v as HistorySort)
    : "recent";
}

export type HistoryScoreRow = Pick<
  Score,
  "id" | "sung_at" | "total_score" | "key_control"
> & {
  song: { id: string; title: string; artist: string } | null;
};

export type HistorySession = Session & { scores: HistoryScoreRow[] };

export async function getHistoryWithSessions(opts?: {
  range?: HistoryRange;
  sort?: HistorySort;
  search?: string;
}): Promise<HistorySession[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sessions")
    .select(
      `
      *,
      scores:scores(
        id, sung_at, total_score, key_control,
        song:songs(id, title, artist)
      )
    `,
    )
    .order("started_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as unknown as HistorySession[];

  // Apply filters + search in memory; sessions are << 1000 so this is cheap.
  const q = opts?.search?.toLowerCase().trim() ?? "";
  const range = opts?.range ?? "all";
  const sort = opts?.sort ?? "recent";

  const matchesRange = (total: number): boolean => {
    if (range === "over90") return total >= 90;
    if (range === "over80") return total >= 80 && total < 90;
    if (range === "under80") return total < 80;
    return true;
  };
  const matchesQuery = (s: HistoryScoreRow): boolean => {
    if (!q) return true;
    if (!s.song) return false;
    return (
      s.song.title.toLowerCase().includes(q) ||
      s.song.artist.toLowerCase().includes(q)
    );
  };

  const out: HistorySession[] = [];
  for (const session of rows) {
    const filtered = session.scores.filter(
      (s) => matchesRange(Number(s.total_score)) && matchesQuery(s),
    );
    if (filtered.length === 0) continue;

    // Score-level sort within the session — session-level ordering remains by sung_at.
    filtered.sort((a, b) => {
      switch (sort) {
        case "oldest":
          return a.sung_at.localeCompare(b.sung_at);
        case "score_desc":
          return Number(b.total_score) - Number(a.total_score);
        case "score_asc":
          return Number(a.total_score) - Number(b.total_score);
        case "recent":
        default:
          return b.sung_at.localeCompare(a.sung_at);
      }
    });

    out.push({ ...session, scores: filtered });
  }

  if (sort === "oldest") {
    // For chronological ordering, flip session order too.
    out.sort((a, b) => a.started_at.localeCompare(b.started_at));
  } else if (sort === "score_desc" || sort === "score_asc") {
    // Sessions ordered by max score they contain, matching the filter direction.
    out.sort((a, b) => {
      const bestA = Math.max(...a.scores.map((s) => Number(s.total_score)));
      const bestB = Math.max(...b.scores.map((s) => Number(s.total_score)));
      return sort === "score_desc" ? bestB - bestA : bestA - bestB;
    });
  }

  return out;
}

export async function getScoresForSong(
  songId: string,
  limit = 10,
): Promise<Score[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scores")
    .select("*")
    .eq("song_id", songId)
    .order("sung_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Score[];
}
