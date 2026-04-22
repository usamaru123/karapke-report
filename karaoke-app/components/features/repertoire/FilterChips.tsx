"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type {
  RepertoireConfidenceFilter,
  RepertoireRangeFilter,
  RepertoireStatusFilter,
} from "@/lib/queries/repertoire";

/**
 * Two independent chip rows — status and confidence — so combinations like
 * "最近歌ってない × 練習中" are expressible. URL params: ?status=&confidence=.
 * Selecting the default chip in either group clears that param.
 */
const STATUS_CHIPS: { key: RepertoireStatusFilter; label: string }[] = [
  { key: "all", label: "すべて" },
  { key: "over90", label: "90+" },
  { key: "recent", label: "最近歌ってない" },
  { key: "favorite", label: "お気に入り" },
];

const CONFIDENCE_CHIPS: {
  key: RepertoireConfidenceFilter;
  label: string;
}[] = [
  { key: "any", label: "どれでも" },
  { key: "unset", label: "未設定" },
  { key: "wanna_sing", label: "歌いたい" },
  { key: "practicing", label: "練習中" },
  { key: "normal", label: "普通" },
  { key: "confident", label: "得意" },
  { key: "shelf", label: "封印" },
];

const RANGE_CHIPS: { key: RepertoireRangeFilter; label: string }[] = [
  { key: "any", label: "音域:指定なし" },
  { key: "in_range", label: "声域内" },
  { key: "key_tweak", label: "キー調整で可" },
  { key: "hard", label: "声域外" },
];

type Props = {
  status: RepertoireStatusFilter;
  confidence: RepertoireConfidenceFilter;
  range: RepertoireRangeFilter;
};

export function FilterChips({ status, confidence, range }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function navigate(mutate: (p: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    router.push(
      params.toString() ? `${pathname}?${params.toString()}` : pathname,
    );
  }

  function setStatus(next: RepertoireStatusFilter) {
    navigate((p) => {
      if (next === "all") p.delete("status");
      else p.set("status", next);
    });
  }
  function setConfidence(next: RepertoireConfidenceFilter) {
    navigate((p) => {
      if (next === "any") p.delete("confidence");
      else p.set("confidence", next);
    });
  }
  function setRange(next: RepertoireRangeFilter) {
    navigate((p) => {
      if (next === "any") p.delete("range");
      else p.set("range", next);
    });
  }

  const chipCls = (on: boolean) =>
    `shrink-0 rounded-full border px-3 py-1 text-xs transition-colors ${
      on
        ? "border-neon-pink text-neon-pink"
        : "border-white/10 text-white/70 hover:border-white/25 hover:text-white"
    }`;

  return (
    <div
      role="group"
      aria-label="レパートリーのフィルタ"
      className="space-y-1"
    >
      <div className="flex gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {STATUS_CHIPS.map((chip) => (
          <button
            key={chip.key}
            type="button"
            aria-pressed={chip.key === status}
            onClick={() => setStatus(chip.key)}
            className={chipCls(chip.key === status)}
          >
            {chip.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {CONFIDENCE_CHIPS.map((chip) => (
          <button
            key={chip.key}
            type="button"
            aria-pressed={chip.key === confidence}
            onClick={() => setConfidence(chip.key)}
            className={chipCls(chip.key === confidence)}
          >
            {chip.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {RANGE_CHIPS.map((chip) => (
          <button
            key={chip.key}
            type="button"
            aria-pressed={chip.key === range}
            onClick={() => setRange(chip.key)}
            className={chipCls(chip.key === range)}
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
}
