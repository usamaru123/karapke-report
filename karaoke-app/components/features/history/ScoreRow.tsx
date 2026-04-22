import { format } from "date-fns";
import Link from "next/link";
import { KeyBadge } from "@/components/ui/KeyBadge";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import type { HistoryScoreRow } from "@/lib/queries/history";

type Props = { score: HistoryScoreRow };

export function ScoreRow({ score }: Props) {
  const time = format(new Date(score.sung_at), "HH:mm");
  return (
    <Link
      href={`/scores/${score.id}`}
      className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-white/[0.04] focus-visible:bg-white/[0.06] focus-visible:outline-none"
    >
      <span className="w-12 shrink-0 font-mono text-xs text-white/40">
        {time}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm text-white">
          {score.song?.title ?? "—"}
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="truncate text-xs text-white/50">
            {score.song?.artist ?? "—"}
          </span>
          <KeyBadge value={score.key_control} />
        </div>
      </div>
      <ScoreBadge value={score.total_score} size="sm" />
    </Link>
  );
}
