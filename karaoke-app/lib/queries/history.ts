import { createClient } from "@/lib/supabase/server";
import type { Score, ScoringType, Session } from "@/types/domain";

export type HistoryRange = "all" | "over90" | "over80" | "under80";
export type HistorySort =
  | "recent"
  | "oldest"
  | "score_desc"
  | "score_asc";
export type HistoryMachine = "any" | ScoringType;

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

const MACHINE_VALUES: readonly HistoryMachine[] = [
  "any",
  "ai",
  "ai_heart",
  "dxg",
  "dx",
  "other",
];

export function parseHistoryMachine(v: string | undefined): HistoryMachine {
  return (MACHINE_VALUES as readonly string[]).includes(v ?? "")
    ? (v as HistoryMachine)
    : "any";
}

/** Accept "YYYY-MM-DD" or empty. Returns null when invalid. */
export function parseIsoDate(v: string | undefined): string | null {
  if (!v) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

/** Accept integer strings in [0, 100]; clamp and return number or null. */
export function parseScoreBound(v: string | undefined): number | null {
  if (v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, n));
}

export type HistoryScoreRow = Pick<
  Score,
  "id" | "sung_at" | "total_score" | "key_control" | "scoring_type"
> & {
  song: { id: string; title: string; artist: string } | null;
};

export type HistorySession = Session & { scores: HistoryScoreRow[] };

export async function getHistoryWithSessions(opts?: {
  range?: HistoryRange;
  sort?: HistorySort;
  search?: string;
  /** "YYYY-MM-DD" (inclusive). null = no lower bound. */
  dateFrom?: string | null;
  /** "YYYY-MM-DD" (inclusive). null = no upper bound. */
  dateTo?: string | null;
  /** Inclusive min total_score, 0-100. null = unconstrained. */
  scoreMin?: number | null;
  /** Inclusive max total_score, 0-100. null = unconstrained. */
  scoreMax?: number | null;
  /** Scoring machine filter. "any" = no filter. */
  machine?: HistoryMachine;
}): Promise<HistorySession[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sessions")
    .select(
      `
      *,
      scores:scores(
        id, sung_at, total_score, key_control, scoring_type,
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
  const dateFromIso = opts?.dateFrom
    ? new Date(`${opts.dateFrom}T00:00:00`).toISOString()
    : null;
  // `dateTo` is inclusive, so add 1 day and use half-open comparison.
  const dateToIso = opts?.dateTo
    ? new Date(
        new Date(`${opts.dateTo}T00:00:00`).getTime() + 86_400_000,
      ).toISOString()
    : null;
  const scoreMin = opts?.scoreMin ?? null;
  const scoreMax = opts?.scoreMax ?? null;
  const machine = opts?.machine ?? "any";

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
  const matchesDate = (sungAt: string): boolean => {
    if (dateFromIso && sungAt < dateFromIso) return false;
    if (dateToIso && sungAt >= dateToIso) return false;
    return true;
  };
  const matchesScoreBounds = (total: number): boolean => {
    if (scoreMin !== null && total < scoreMin) return false;
    if (scoreMax !== null && total > scoreMax) return false;
    return true;
  };
  const matchesMachine = (st: ScoringType | null): boolean => {
    if (machine === "any") return true;
    return st === machine;
  };

  const out: HistorySession[] = [];
  for (const session of rows) {
    const filtered = session.scores.filter((s) => {
      const total = Number(s.total_score);
      return (
        matchesRange(total) &&
        matchesQuery(s) &&
        matchesDate(s.sung_at) &&
        matchesScoreBounds(total) &&
        matchesMachine(s.scoring_type ?? null)
      );
    });
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
