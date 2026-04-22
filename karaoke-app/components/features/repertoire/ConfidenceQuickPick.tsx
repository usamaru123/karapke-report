"use client";

import { useState, useTransition } from "react";
import { setRepertoireConfidence } from "@/lib/actions/repertoire";
import type { ConfidenceLevel } from "@/types/domain";

type Props = {
  repertoireId: string;
  initial: ConfidenceLevel;
  /** Visual size. `md` is the tappable row variant, `sm` for dense surfaces. */
  size?: "sm" | "md";
};

const OPTIONS: { value: ConfidenceLevel; label: string }[] = [
  { value: "unset", label: "未設定" },
  { value: "wanna_sing", label: "歌いたい" },
  { value: "practicing", label: "練習中" },
  { value: "normal", label: "普通" },
  { value: "confident", label: "得意" },
  { value: "shelf", label: "封印" },
];

const COLOR_BY_LEVEL: Record<ConfidenceLevel, string> = {
  unset: "border-white/25 text-white/60 bg-white/[0.03]",
  wanna_sing: "border-neon-amber/50 text-neon-amber bg-neon-amber/10",
  practicing: "border-neon-cyan/50 text-neon-cyan bg-neon-cyan/10",
  normal: "border-white/30 text-white/80 bg-white/[0.03]",
  confident: "border-neon-pink/50 text-neon-pink bg-neon-pink/10",
  shelf: "border-white/15 text-white/40 bg-white/[0.02]",
};

/**
 * Inline confidence selector. Rendered as a rounded pill wrapping a native
 * `<select>`; sizes aim at ≥ 28px tap targets on mobile. Optimistic update
 * with rollback on failure. The caller is responsible for giving us a
 * `pointer-events-auto` container if we sit on top of a click-through Link.
 */
export function ConfidenceQuickPick({
  repertoireId,
  initial,
  size = "md",
}: Props) {
  const [value, setValue] = useState<ConfidenceLevel>(initial);
  const [isPending, startTransition] = useTransition();

  function handleChange(next: ConfidenceLevel) {
    if (next === value) return;
    const prev = value;
    setValue(next);
    startTransition(async () => {
      try {
        await setRepertoireConfidence(repertoireId, next);
      } catch {
        setValue(prev);
      }
    });
  }

  const sizeCls =
    size === "sm"
      ? "text-[11px] h-6 px-2"
      : "text-xs h-7 px-2.5";
  const colorCls = COLOR_BY_LEVEL[value];

  return (
    <div
      className={`inline-flex items-center rounded-full border ${sizeCls} ${colorCls} ${
        isPending ? "opacity-60" : ""
      }`}
      // Stop navigation if we're sitting on top of a parent <Link>.
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <select
        value={value}
        disabled={isPending}
        onChange={(e) => handleChange(e.target.value as ConfidenceLevel)}
        className="h-full cursor-pointer bg-transparent pr-1 font-semibold outline-none"
        aria-label="自信度を変更"
      >
        {OPTIONS.map((o) => (
          <option
            key={o.value}
            value={o.value}
            className="bg-bg-elevated text-white"
          >
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
