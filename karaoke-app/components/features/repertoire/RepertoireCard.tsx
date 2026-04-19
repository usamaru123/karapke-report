import Link from "next/link";
import { ConfidenceStars } from "@/components/ui/ConfidenceStars";
import { KeyBadge } from "@/components/ui/KeyBadge";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { formatShortDate } from "@/lib/format";
import type { RepertoireWithMeta } from "@/lib/queries/repertoire";

type Props = { item: RepertoireWithMeta };

export function RepertoireCard({ item }: Props) {
  const { song } = item;

  return (
    <Link
      href={`/repertoire/${item.id}`}
      className="block min-h-16 border-b border-white/10 px-4 py-3 transition-colors hover:bg-white/[0.03] focus-visible:bg-white/[0.05] focus-visible:outline-none"
    >
      <div className="flex items-start justify-between gap-3">
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

      <div className="mt-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {item.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-white/60"
            >
              #{tag}
            </span>
          ))}
          <ConfidenceStars level={item.confidence} />
        </div>
        <div className="shrink-0 text-[11px] text-white/50">
          最終歌唱: {formatShortDate(item.last_sung_at)}
        </div>
      </div>
    </Link>
  );
}
