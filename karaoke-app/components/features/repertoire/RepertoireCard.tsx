import Link from "next/link";
import { ConfidenceQuickPick } from "@/components/features/repertoire/ConfidenceQuickPick";
import { KeyBadge } from "@/components/ui/KeyBadge";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { VocalRangeBadge } from "@/components/ui/VocalRangeBadge";
import { formatShortDate } from "@/lib/format";
import type { RepertoireWithMeta } from "@/lib/queries/repertoire";
import type { UserVocalRange } from "@/lib/queries/user_range";
import { evaluateVocalRange } from "@/lib/vocal-range";

type Props = { item: RepertoireWithMeta; userRange: UserVocalRange };

/**
 * Repertoire list row. The whole card acts as a link to /repertoire/[id],
 * but the confidence quick-pick sits on a z-index above the
 * absolute-positioned <Link> so its tap target doesn't navigate away.
 */
export function RepertoireCard({ item, userRange }: Props) {
  const { song } = item;
  const verdict = evaluateVocalRange(
    { low: song.vocal_range_lowest, high: song.vocal_range_highest },
    { low: userRange.low, high: userRange.high },
  );

  return (
    <div className="relative min-h-16 border-b border-white/10 px-4 py-3 transition-colors hover:bg-white/[0.03] focus-within:bg-white/[0.05]">
      <Link
        href={`/repertoire/${item.id}`}
        className="absolute inset-0 z-0 focus-visible:outline-none"
        aria-label={`${song.title} の詳細を開く`}
      />

      <div className="pointer-events-none relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-semibold text-white">
            {song.title}
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="truncate text-sm text-white/60">
              {song.artist}
            </span>
            <KeyBadge value={item.preferred_key} />
          </div>
        </div>
        <ScoreBadge value={item.best_score} size="md" />
      </div>

      <div className="relative z-10 mt-2 flex items-center justify-between gap-3">
        <div className="pointer-events-auto flex min-w-0 flex-wrap items-center gap-2">
          <ConfidenceQuickPick
            repertoireId={item.id}
            initial={item.confidence}
            size="md"
          />
          <VocalRangeBadge verdict={verdict} size="sm" />
        </div>
        <div className="pointer-events-none shrink-0 text-[11px] text-white/50">
          最終: {formatShortDate(item.last_sung_at)}
        </div>
      </div>
    </div>
  );
}
