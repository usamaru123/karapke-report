"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { RepertoireFilter } from "@/lib/queries/repertoire";

type Chip = { key: RepertoireFilter; label: string };

/**
 * Two chip groups rendered side-by-side:
 *   - generic views (all / 90+ / recent / favorite)
 *   - confidence buckets (歌いたい / 練習中 / 得意 / 封印)
 * Selecting any chip resets the other group via a single `filter` query param.
 */
const STATUS_CHIPS: Chip[] = [
  { key: "all", label: "すべて" },
  { key: "over90", label: "90+" },
  { key: "recent", label: "最近歌ってない" },
  { key: "favorite", label: "お気に入り" },
];

const GROUP_CHIPS: Chip[] = [
  { key: "wanna_sing", label: "歌いたい" },
  { key: "practicing", label: "練習中" },
  { key: "confident", label: "得意" },
  { key: "shelf", label: "封印" },
];

type Props = {
  active: RepertoireFilter;
};

export function FilterChips({ active }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function selectFilter(key: RepertoireFilter) {
    const params = new URLSearchParams(searchParams.toString());
    if (key === "all") params.delete("filter");
    else params.set("filter", key);
    router.push(`${pathname}?${params.toString()}`);
  }

  const renderChip = (chip: Chip) => {
    const on = chip.key === active;
    return (
      <button
        key={chip.key}
        type="button"
        role="tab"
        aria-selected={on}
        onClick={() => selectFilter(chip.key)}
        className={`shrink-0 rounded-full border px-3 py-1 text-xs transition-colors ${
          on
            ? "border-neon-pink text-neon-pink"
            : "border-white/10 text-white/70 hover:border-white/25 hover:text-white"
        }`}
      >
        {chip.label}
      </button>
    );
  };

  return (
    <div
      role="tablist"
      aria-label="レパートリーのフィルタ"
      className="space-y-1"
    >
      <div className="flex gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {STATUS_CHIPS.map(renderChip)}
      </div>
      <div className="flex gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {GROUP_CHIPS.map(renderChip)}
      </div>
    </div>
  );
}
