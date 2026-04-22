"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type {
  HistoryRange,
  HistorySort,
} from "@/lib/queries/history";

type Props = {
  range: HistoryRange;
  sort: HistorySort;
  initialQuery: string;
};

const RANGES: { key: HistoryRange; label: string }[] = [
  { key: "all", label: "すべて" },
  { key: "over90", label: "90+" },
  { key: "over80", label: "80-90" },
  { key: "under80", label: "<80" },
];

const SORTS: { key: HistorySort; label: string }[] = [
  { key: "recent", label: "新しい順" },
  { key: "oldest", label: "古い順" },
  { key: "score_desc", label: "点数 高→低" },
  { key: "score_asc", label: "点数 低→高" },
];

/**
 * Search + score-range chips + sort for the /history page. Replaces the
 * old this_month / this_year PeriodTabs. URL params: q, range, sort.
 */
export function HistoryToolbar({ range, sort, initialQuery }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(initialQuery);

  function push(mutate: (p: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    router.push(
      params.toString() ? `${pathname}?${params.toString()}` : pathname,
    );
  }

  function onSubmitSearch(e: React.FormEvent) {
    e.preventDefault();
    push((p) => {
      const trimmed = q.trim();
      if (trimmed) p.set("q", trimmed);
      else p.delete("q");
    });
  }

  return (
    <div className="space-y-2 px-4 py-2">
      <form onSubmit={onSubmitSearch} className="flex gap-2">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="曲名・アーティストで絞り込み"
          className="flex-1 rounded-md border border-white/10 bg-bg-elevated px-2.5 py-1.5 text-sm text-white outline-none focus:border-neon-cyan"
        />
        <button
          type="submit"
          className="rounded-md border border-neon-cyan/40 bg-neon-cyan/10 px-3 py-1.5 text-xs font-semibold text-neon-cyan hover:bg-neon-cyan/15"
        >
          絞込
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] text-white/40">点数</span>
        {RANGES.map((r) => {
          const on = r.key === range;
          return (
            <button
              key={r.key}
              type="button"
              aria-pressed={on}
              onClick={() =>
                push((p) => {
                  if (r.key === "all") p.delete("range");
                  else p.set("range", r.key);
                })
              }
              className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] transition-colors ${
                on
                  ? "border-neon-pink text-neon-pink"
                  : "border-white/10 text-white/60 hover:border-white/25 hover:text-white"
              }`}
            >
              {r.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] text-white/40">並び</span>
        <select
          value={sort}
          onChange={(e) =>
            push((p) => {
              const v = e.target.value;
              if (v === "recent") p.delete("sort");
              else p.set("sort", v);
            })
          }
          className="rounded-md border border-white/10 bg-bg-elevated px-2 py-1 text-xs text-white outline-none focus:border-neon-cyan"
        >
          {SORTS.map((s) => (
            <option key={s.key} value={s.key} className="bg-bg-elevated">
              {s.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
