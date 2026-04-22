import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { ScoreRow } from "./ScoreRow";
import type { HistorySession } from "@/lib/queries/history";

type Props = { session: HistorySession };

export function SessionGroup({ session }: Props) {
  const started = new Date(session.started_at);
  const label = format(started, "M月d日 (E)", { locale: ja });
  const count = session.scores.length;

  // Per-session aggregates. Useful at a glance when scrolling history:
  // "was this a hot day or a practice day?"
  const scoreValues = session.scores
    .map((s) => s.total_score)
    .filter((v): v is number => typeof v === "number");
  const avgScore =
    scoreValues.length > 0
      ? scoreValues.reduce((acc, v) => acc + v, 0) / scoreValues.length
      : null;
  const maxScore = scoreValues.length > 0 ? Math.max(...scoreValues) : null;

  return (
    <section className="py-3">
      <div className="mb-2 flex items-center gap-2 px-4">
        <span
          aria-hidden
          className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"
        />
        <h3 className="flex items-center gap-2 text-xs text-white/60 tabular-nums">
          <span className="font-medium text-white/80">{label}</span>
          <span aria-hidden className="text-white/25">·</span>
          <span>{count}曲</span>
          {avgScore !== null && (
            <>
              <span aria-hidden className="text-white/25">·</span>
              <span>平均 {avgScore.toFixed(1)}</span>
            </>
          )}
          {maxScore !== null && (
            <>
              <span aria-hidden className="text-white/25">·</span>
              <span className="text-neon-pink/80">最高 {maxScore.toFixed(1)}</span>
            </>
          )}
        </h3>
        <span
          aria-hidden
          className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"
        />
      </div>
      <ul className="divide-y divide-white/5 overflow-hidden rounded-lg border border-white/10 bg-bg-surface mx-4">
        {session.scores.map((score) => (
          <li key={score.id}>
            <ScoreRow score={score} />
          </li>
        ))}
      </ul>
    </section>
  );
}
