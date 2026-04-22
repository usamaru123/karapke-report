import { AlertTriangle, CircleCheck, Mic2 } from "lucide-react";
import type { VocalRangeVerdict } from "@/lib/vocal-range";

type Size = "sm" | "md";

type Props = {
  verdict: VocalRangeVerdict;
  size?: Size;
  /** Hide the text label (used for dense list rows). */
  compact?: boolean;
};

function label(v: VocalRangeVerdict): string {
  switch (v.kind) {
    case "fits":
      return "声域内";
    case "key_tweak":
      return v.reason === "too_high"
        ? "KEY-で歌える"
        : v.reason === "too_low"
          ? "KEY+で歌える"
          : "KEY 調整で歌える";
    case "hard":
      return "声域外";
    case "unknown":
      return v.reason === "missing_user" ? "声域未測定" : "音域データなし";
  }
}

function classesFor(v: VocalRangeVerdict): {
  border: string;
  bg: string;
  text: string;
} {
  switch (v.kind) {
    case "fits":
      return {
        border: "border-neon-green/40",
        bg: "bg-neon-green/10",
        text: "text-neon-green",
      };
    case "key_tweak":
      return {
        border: "border-neon-amber/40",
        bg: "bg-neon-amber/10",
        text: "text-neon-amber",
      };
    case "hard":
      return {
        border: "border-red-500/40",
        bg: "bg-red-500/10",
        text: "text-red-300",
      };
    case "unknown":
      return {
        border: "border-white/10",
        bg: "bg-white/5",
        text: "text-white/40",
      };
  }
}

export function VocalRangeBadge({ verdict, size = "sm", compact }: Props) {
  const cls = classesFor(verdict);
  const iconSize = size === "md" ? 14 : 11;
  const Icon =
    verdict.kind === "fits"
      ? CircleCheck
      : verdict.kind === "hard"
        ? AlertTriangle
        : Mic2;
  const padding = size === "md" ? "px-2.5 py-1 text-xs" : "px-1.5 py-0.5 text-[10px]";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border ${padding} ${cls.border} ${cls.bg} ${cls.text}`}
      title={title(verdict)}
    >
      <Icon size={iconSize} />
      {!compact && <span>{label(verdict)}</span>}
    </span>
  );
}

function title(v: VocalRangeVerdict): string {
  if (v.kind === "unknown") return label(v);
  const low = v.lowMargin >= 0 ? `低 +${v.lowMargin}` : `低 ${v.lowMargin}`;
  const high = v.highMargin >= 0 ? `高 +${v.highMargin}` : `高 ${v.highMargin}`;
  return `声域マージン: ${low}, ${high} (半音単位)`;
}
