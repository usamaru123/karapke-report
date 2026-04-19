import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { ScoreRow } from "./ScoreRow";
import type { HistorySession } from "@/lib/queries/history";

type Props = { session: HistorySession };

export function SessionGroup({ session }: Props) {
  const started = new Date(session.started_at);
  const label = format(started, "M月d日 (E)", { locale: ja });
  const count = session.scores.length;

  return (
    <section className="py-3">
      <div className="mb-2 flex items-center gap-2 px-4">
        <span
          aria-hidden
          className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"
        />
        <h3 className="text-xs text-white/60 tabular-nums">
          {label} · {count}曲歌唱
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
