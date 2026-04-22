"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { toMonthKey } from "@/lib/month-key";

type Props = {
  /** Currently shown month as "YYYY-MM". */
  selected: string;
  /** Set of "YYYY-MM" keys we have data for, for the dropdown + nav guards. */
  availableMonths: string[];
  /** Latest "YYYY-MM" (usually current month). Next-button disabled at/after. */
  latest: string;
};

function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, (m ?? 1) - 1 + delta, 1);
  return toMonthKey(d);
}

/**
 * Month selector for /stats drill-down. Shows previous/next arrows plus a
 * dropdown of months with data. "Latest" (= current month by default) is the
 * rightmost valid position; further forward is disabled.
 *
 * Why the dropdown + arrows both: arrows are fast for adjacent navigation,
 * but if the user hasn't sung for 3 months, pressing ← three times is silly
 * when they can just pick the month directly.
 */
export function MonthPicker({ selected, availableMonths, latest }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  function go(next: string) {
    // When landing on "latest", drop the param so the URL stays canonical.
    const params = new URLSearchParams();
    if (next !== latest) params.set("month", next);
    const q = params.toString();
    router.push(q ? `${pathname}?${q}` : pathname);
  }

  const prev = shiftMonth(selected, -1);
  const next = shiftMonth(selected, 1);
  const canNext = next <= latest;
  // Arrow ← should always work as long as the user can see months past the
  // landing page. We don't gate it on availableMonths because empty months
  // are still legitimate (just show "0 件").

  return (
    <div
      role="group"
      aria-label="表示する月の選択"
      className="flex items-center gap-2 px-4 py-2"
    >
      <button
        type="button"
        onClick={() => go(prev)}
        aria-label="前の月"
        className="flex h-8 w-8 items-center justify-center rounded-md border border-white/10 text-white/70 transition-colors hover:border-white/30 hover:text-white"
      >
        <ChevronLeft size={16} />
      </button>
      <label className="relative flex-1">
        <span className="sr-only">月を選択</span>
        <select
          value={selected}
          onChange={(e) => go(e.target.value)}
          className="w-full appearance-none rounded-md border border-white/10 bg-bg-surface px-3 py-1.5 text-sm text-white outline-none transition-colors focus:border-neon-cyan"
        >
          {/* If the selected month isn't in available list (e.g. future), add
              it so the value stays controlled. */}
          {!availableMonths.includes(selected) && (
            <option value={selected}>{selected}</option>
          )}
          {availableMonths.map((m) => (
            <option key={m} value={m}>
              {m}
              {m === latest ? " (最新)" : ""}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={() => canNext && go(next)}
        aria-label="次の月"
        disabled={!canNext}
        className="flex h-8 w-8 items-center justify-center rounded-md border border-white/10 text-white/70 transition-colors hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
