import type { ConfidenceLevel } from "@/types/domain";

type Props = { level: ConfidenceLevel };

const LEVEL_TO_FILLED: Record<ConfidenceLevel, number> = {
  practicing: 1,
  normal: 2,
  confident: 3,
};

const LEVEL_LABEL: Record<ConfidenceLevel, string> = {
  practicing: "練習中",
  normal: "普通",
  confident: "得意",
};

export function ConfidenceStars({ level }: Props) {
  const filled = LEVEL_TO_FILLED[level];
  return (
    <span
      className="inline-flex items-center gap-1 text-xs text-white/70"
      aria-label={`自信度: ${LEVEL_LABEL[level]}`}
    >
      <span aria-hidden className="tracking-tight">
        {"★".repeat(filled)}
        <span className="text-white/20">{"★".repeat(3 - filled)}</span>
      </span>
      <span className="text-white/50">{LEVEL_LABEL[level]}</span>
    </span>
  );
}
