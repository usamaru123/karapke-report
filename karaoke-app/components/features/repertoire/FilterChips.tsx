"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { RepertoireFilter } from "@/lib/queries/repertoire";

const CHIPS: { key: RepertoireFilter; label: string }[] = [
  { key: "all", label: "すべて" },
  { key: "over90", label: "90+" },
  { key: "recent", label: "最近歌ってない" },
  { key: "favorite", label: "お気に入り" },
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

  return (
    <div
      className="flex gap-2 overflow-x-auto px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="tablist"
      aria-label="レパートリーのフィルタ"
    >
      {CHIPS.map((chip) => {
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
      })}
    </div>
  );
}
