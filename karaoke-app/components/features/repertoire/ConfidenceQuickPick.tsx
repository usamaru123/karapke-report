"use client";

import { useState, useTransition } from "react";
import { setRepertoireConfidence } from "@/lib/actions/repertoire";
import type { ConfidenceLevel } from "@/types/domain";

type Props = {
  repertoireId: string;
  initial: ConfidenceLevel;
  /** Compact mode for the repertoire list row. */
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
  unset: "border-white/20 text-white/50",
  wanna_sing: "border-neon-amber/40 text-neon-amber",
  practicing: "border-neon-cyan/40 text-neon-cyan",
  normal: "border-white/30 text-white/80",
  confident: "border-neon-pink/40 text-neon-pink",
  shelf: "border-white/10 text-white/40",
};

/**
 * Inline confidence selector for the repertoire list row. Native <select>
 * so it feels right on mobile; styled as a small pill to match the row
 * chrome. Optimistic update + rollback on failure.
 */
export function ConfidenceQuickPick({
  repertoireId,
  initial,
  size = "sm",
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
    size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1";
  const colorCls = COLOR_BY_LEVEL[value];

  return (
    <label
      className={`inline-flex items-center rounded-full border bg-bg-surface ${sizeCls} ${colorCls} ${
        isPending ? "opacity-60" : ""
      }`}
      // Keep the parent card's Link from capturing the click.
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <select
        value={value}
        disabled={isPending}
        onChange={(e) => handleChange(e.target.value as ConfidenceLevel)}
        className="bg-transparent outline-none"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value} className="bg-bg-elevated text-white">
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
