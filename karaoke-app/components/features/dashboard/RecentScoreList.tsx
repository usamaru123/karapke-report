import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { formatShortDate } from "@/lib/format";
import type { RecentScore } from "@/lib/queries/dashboard";

type Props = { scores: RecentScore[] };

export function RecentScoreList({ scores }: Props) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">最近の歌唱</h2>
        <Link
          href="/history"
          className="flex items-center gap-0.5 text-xs text-neon-cyan hover:underline"
        >
          すべて見る
          <ChevronRight size={12} />
        </Link>
      </div>

      {scores.length === 0 ? (
        <p className="rounded-lg border border-white/10 bg-bg-surface px-4 py-6 text-center text-sm text-white/50">
          まだ歌唱データがありません
        </p>
      ) : (
        <ul className="divide-y divide-white/10 overflow-hidden rounded-lg border border-white/10 bg-bg-surface">
          {scores.map((s) => (
            <li key={s.id}>
              <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-white">
                    {s.song?.title ?? "—"}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-white/50">
                    {s.song?.artist ?? "—"}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <ScoreBadge value={s.total_score} size="sm" />
                  <span className="text-[10px] text-white/40 tabular-nums">
                    {formatShortDate(s.sung_at)}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
