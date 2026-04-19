import Link from "next/link";
import { formatShortDate } from "@/lib/format";
import type { SetlistWithItems } from "@/lib/queries/setlists";
import { PinToggle } from "./PinToggle";

type Props = { setlist: SetlistWithItems };

function formatDuration(totalSec: number): string {
  if (totalSec <= 0) return "—";
  const mins = Math.round(totalSec / 60);
  return `約${mins}分`;
}

export function SetlistCard({ setlist }: Props) {
  const itemCount = setlist.items.length;
  const firstThree = setlist.items.slice(0, 3);
  const extra = Math.max(0, itemCount - 3);

  return (
    <Link
      href={`/setlists/${setlist.id}`}
      className={`block rounded-xl border bg-bg-surface p-4 transition-colors hover:bg-bg-elevated ${
        setlist.is_pinned
          ? "border-neon-cyan/40 shadow-glow-cyan"
          : "border-white/10"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-white">
            {setlist.name}
          </h3>
          <p className="mt-0.5 text-xs text-white/50 tabular-nums">
            {itemCount}曲 · {formatDuration(setlist.totalDurationSec)}
          </p>
        </div>
        <PinToggle setlistId={setlist.id} pinned={setlist.is_pinned} />
      </div>

      {firstThree.length > 0 && (
        <ul className="mt-3 flex flex-wrap items-center gap-1.5">
          {firstThree.map((it) => (
            <li
              key={it.id}
              className="max-w-[10rem] truncate rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-white/70"
            >
              {it.song?.title ?? "—"}
            </li>
          ))}
          {extra > 0 && (
            <li className="rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-white/50 tabular-nums">
              +{extra}
            </li>
          )}
        </ul>
      )}

      <p className="mt-3 text-[10px] text-white/40">
        作成: {formatShortDate(setlist.created_at)}
      </p>
    </Link>
  );
}
