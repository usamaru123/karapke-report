"use client";

import { ChevronDown } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { RepertoireSort } from "@/lib/queries/repertoire";

const LABELS: Record<RepertoireSort, string> = {
  best_score: "最高点順",
  avg: "平均点順",
  recent: "最終歌唱日順",
  count: "歌唱回数順",
  growth: "伸び率順",
  stability: "安定度順",
  title: "曲名順",
  added: "追加日順",
};

const ORDER: RepertoireSort[] = [
  "best_score",
  "avg",
  "recent",
  "count",
  "growth",
  "stability",
  "title",
  "added",
];

type Props = {
  active: RepertoireSort;
};

export function SortMenu({ active }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function change(next: RepertoireSort) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "best_score") params.delete("sort");
    else params.set("sort", next);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <label className="flex items-center gap-1 text-white/70">
      <span>並び替え:</span>
      <span className="relative">
        <select
          value={active}
          onChange={(e) => change(e.target.value as RepertoireSort)}
          className="appearance-none bg-transparent pr-5 text-white outline-none focus:text-neon-cyan"
        >
          {ORDER.map((k) => (
            <option key={k} value={k} className="bg-bg-surface text-white">
              {LABELS[k]}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-white/50"
        />
      </span>
    </label>
  );
}
