"use client";

import { X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type {
  RepertoireConfidenceFilter,
  RepertoireRangeFilter,
  RepertoireStatusFilter,
} from "@/lib/queries/repertoire";

const STATUS_LABELS: Record<RepertoireStatusFilter, string> = {
  all: "すべて",
  over90: "90+",
  recent: "最近歌ってない",
  favorite: "お気に入り",
};

const CONFIDENCE_LABELS: Record<RepertoireConfidenceFilter, string> = {
  any: "どれでも",
  unset: "未設定",
  wanna_sing: "歌いたい",
  practicing: "練習中",
  normal: "普通",
  confident: "得意",
  shelf: "封印",
};

const RANGE_LABELS: Record<RepertoireRangeFilter, string> = {
  any: "音域:指定なし",
  in_range: "声域内",
  key_tweak: "キー調整で可",
  hard: "声域外",
};

type Props = {
  status: RepertoireStatusFilter;
  confidence: RepertoireConfidenceFilter;
  range: RepertoireRangeFilter;
  /** Search term (optional). Shown as chip, clearable. */
  search?: string;
  /** Total matched item count for current filter set. */
  total: number;
};

/**
 * Sits above the filter chip rows. Shows what's narrowing the list ("得意 ×
 * 90+ · 12件") plus a one-tap "クリア". Hidden entirely when no filter is
 * active so we don't eat vertical space on the default view.
 */
export function FilterSummaryBar({
  status,
  confidence,
  range,
  search,
  total,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const hasStatus = status !== "all";
  const hasConfidence = confidence !== "any";
  const hasRange = range !== "any";
  const hasSearch = !!search && search.length > 0;

  if (!hasStatus && !hasConfidence && !hasRange && !hasSearch) return null;

  function clearAll() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("status");
    params.delete("confidence");
    params.delete("range");
    params.delete("q");
    const q = params.toString();
    router.push(q ? `${pathname}?${q}` : pathname);
  }

  function clearOne(key: "status" | "confidence" | "range" | "q") {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(key);
    const q = params.toString();
    router.push(q ? `${pathname}?${q}` : pathname);
  }

  const activeChips: { label: string; onClear: () => void }[] = [];
  if (hasStatus)
    activeChips.push({
      label: STATUS_LABELS[status],
      onClear: () => clearOne("status"),
    });
  if (hasConfidence)
    activeChips.push({
      label: CONFIDENCE_LABELS[confidence],
      onClear: () => clearOne("confidence"),
    });
  if (hasRange)
    activeChips.push({
      label: RANGE_LABELS[range],
      onClear: () => clearOne("range"),
    });
  if (hasSearch)
    activeChips.push({
      label: `"${search}"`,
      onClear: () => clearOne("q"),
    });

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 pt-1 pb-1 text-[11px] text-white/60">
      <span className="text-white/50">適用中:</span>
      {activeChips.map((c) => (
        <span
          key={c.label}
          className="inline-flex items-center gap-1 rounded-full border border-neon-pink/40 bg-neon-pink/10 px-2 py-0.5 text-neon-pink"
        >
          {c.label}
          <button
            type="button"
            aria-label={`${c.label} を外す`}
            onClick={c.onClear}
            className="inline-flex h-3 w-3 items-center justify-center rounded-full hover:bg-white/10"
          >
            <X size={10} />
          </button>
        </span>
      ))}
      <span className="tabular-nums text-white/80">· {total} 件</span>
      <button
        type="button"
        onClick={clearAll}
        className="ml-auto text-white/60 underline underline-offset-2 hover:text-white"
      >
        すべてクリア
      </button>
    </div>
  );
}
