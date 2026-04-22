"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type {
  HistoryMachine,
  HistoryRange,
  HistorySort,
} from "@/lib/queries/history";

type Props = {
  range: HistoryRange;
  sort: HistorySort;
  initialQuery: string;
  /** Current YYYY-MM-DD lower bound, or empty string. */
  dateFrom: string;
  /** Current YYYY-MM-DD upper bound, or empty string. */
  dateTo: string;
  /** Current min score (0..100) as string, or empty. */
  scoreMin: string;
  /** Current max score (0..100) as string, or empty. */
  scoreMax: string;
  /** Current machine filter. */
  machine: HistoryMachine;
};

const MACHINES: { key: HistoryMachine; label: string }[] = [
  { key: "any", label: "全機種" },
  { key: "ai", label: "精密採点 Ai" },
  { key: "ai_heart", label: "Ai Heart" },
  { key: "dxg", label: "DX-G" },
  { key: "dx", label: "DX" },
  { key: "other", label: "その他" },
];

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
export function HistoryToolbar({
  range,
  sort,
  initialQuery,
  dateFrom,
  dateTo,
  scoreMin,
  scoreMax,
  machine,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(initialQuery);
  const [df, setDf] = useState(dateFrom);
  const [dt, setDt] = useState(dateTo);
  const [sMin, setSMin] = useState(scoreMin);
  const [sMax, setSMax] = useState(scoreMax);

  // Advanced filters start collapsed — the 3 extra inputs cluttered the
  // toolbar on mobile when always visible. Opens automatically when any
  // advanced filter is already active on landing.
  const advancedActive =
    !!dateFrom || !!dateTo || !!scoreMin || !!scoreMax || machine !== "any";
  const [advOpen, setAdvOpen] = useState(advancedActive);

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

  function applyAdvanced() {
    push((p) => {
      if (df) p.set("date_from", df);
      else p.delete("date_from");
      if (dt) p.set("date_to", dt);
      else p.delete("date_to");
      if (sMin) p.set("score_min", sMin);
      else p.delete("score_min");
      if (sMax) p.set("score_max", sMax);
      else p.delete("score_max");
    });
  }

  function clearAdvanced() {
    setDf("");
    setDt("");
    setSMin("");
    setSMax("");
    push((p) => {
      p.delete("date_from");
      p.delete("date_to");
      p.delete("score_min");
      p.delete("score_max");
      p.delete("machine");
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
        <span className="ml-2 text-[10px] text-white/40">機種</span>
        <select
          value={machine}
          onChange={(e) =>
            push((p) => {
              const v = e.target.value;
              if (v === "any") p.delete("machine");
              else p.set("machine", v);
            })
          }
          className="rounded-md border border-white/10 bg-bg-elevated px-2 py-1 text-xs text-white outline-none focus:border-neon-cyan"
        >
          {MACHINES.map((m) => (
            <option key={m.key} value={m.key} className="bg-bg-elevated">
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={() => setAdvOpen((o) => !o)}
        aria-expanded={advOpen}
        className="flex items-center gap-1 text-[11px] text-white/60 hover:text-white"
      >
        {advOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        詳細フィルタ
        {advancedActive && !advOpen && (
          <span className="ml-1 rounded-full bg-neon-pink/20 px-1.5 text-[10px] text-neon-pink">
            適用中
          </span>
        )}
      </button>

      {advOpen && (
        <div className="space-y-2 rounded-md border border-white/10 bg-bg-surface px-3 py-2">
          <label className="flex items-center gap-2 text-[11px] text-white/60">
            <span className="w-12 shrink-0">期間</span>
            <input
              type="date"
              value={df}
              onChange={(e) => setDf(e.target.value)}
              className="min-w-0 flex-1 rounded border border-white/10 bg-bg-elevated px-1.5 py-1 text-xs text-white outline-none"
            />
            <span className="text-white/30">〜</span>
            <input
              type="date"
              value={dt}
              onChange={(e) => setDt(e.target.value)}
              className="min-w-0 flex-1 rounded border border-white/10 bg-bg-elevated px-1.5 py-1 text-xs text-white outline-none"
            />
          </label>
          <label className="flex items-center gap-2 text-[11px] text-white/60">
            <span className="w-12 shrink-0">点数</span>
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={sMin}
              onChange={(e) => setSMin(e.target.value)}
              placeholder="下限"
              className="w-20 rounded border border-white/10 bg-bg-elevated px-1.5 py-1 text-xs text-white outline-none tabular-nums"
            />
            <span className="text-white/30">〜</span>
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={sMax}
              onChange={(e) => setSMax(e.target.value)}
              placeholder="上限"
              className="w-20 rounded border border-white/10 bg-bg-elevated px-1.5 py-1 text-xs text-white outline-none tabular-nums"
            />
          </label>
          <div className="flex justify-end gap-2">
            {advancedActive && (
              <button
                type="button"
                onClick={clearAdvanced}
                className="rounded-md px-2.5 py-1 text-[11px] text-white/60 hover:text-white"
              >
                クリア
              </button>
            )}
            <button
              type="button"
              onClick={applyAdvanced}
              className="rounded-md border border-neon-cyan/40 bg-neon-cyan/10 px-3 py-1 text-[11px] font-semibold text-neon-cyan hover:bg-neon-cyan/15"
            >
              適用
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
