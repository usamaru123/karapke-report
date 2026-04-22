import { CalendarClock, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { UpcomingSetlist } from "@/lib/queries/setlists";

type Props = { upcoming: UpcomingSetlist | null };

/**
 * Countdown banner for the nearest scheduled setlist. Hidden when nothing is
 * planned — the default state, and adding a placeholder would just be noise.
 *
 * Copy:
 *  daysUntil === 0  → "今日"
 *  daysUntil === 1  → "明日"
 *  daysUntil >= 2   → "あと N 日"
 */
export function NextSessionBanner({ upcoming }: Props) {
  if (!upcoming) return null;

  const { daysUntil } = upcoming;
  const countdown =
    daysUntil === 0
      ? "今日"
      : daysUntil === 1
        ? "明日"
        : `あと ${daysUntil} 日`;

  return (
    <Link
      href={`/setlists/${upcoming.id}`}
      className="mx-4 mt-3 flex items-center gap-3 rounded-xl border border-neon-amber/30 bg-neon-amber/[0.08] px-4 py-3 text-white transition-colors hover:bg-neon-amber/[0.12]"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neon-amber/15 text-neon-amber">
        <CalendarClock size={18} aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2 text-xs text-neon-amber/90">
          <span className="font-semibold">{countdown}</span>
          <span className="tabular-nums text-white/50">
            {upcoming.scheduledFor}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="truncate text-sm font-semibold">
            {upcoming.name}
          </span>
          <span className="shrink-0 text-xs text-white/50 tabular-nums">
            {upcoming.itemCount} 曲
          </span>
        </div>
      </div>
      <ChevronRight size={16} className="shrink-0 text-white/40" aria-hidden />
    </Link>
  );
}
