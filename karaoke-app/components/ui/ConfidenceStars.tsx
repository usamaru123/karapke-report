import type { ConfidenceLevel } from "@/types/domain";

type Props = { level: ConfidenceLevel };

/**
 * Ordered 1..5 stars corresponding to the confidence_level enum values.
 * Kept here in one place so a future enum extension / reorder is local.
 */
const LEVEL_TO_FILLED: Record<ConfidenceLevel, number> = {
  unset: 0,
  wanna_sing: 1,
  practicing: 2,
  normal: 3,
  confident: 4,
  shelf: 5,
};

const LEVEL_LABEL: Record<ConfidenceLevel, string> = {
  unset: "未設定",
  wanna_sing: "歌いたい",
  practicing: "練習中",
  normal: "普通",
  confident: "得意",
  shelf: "封印",
};

const TOTAL_STARS = 5;

export function ConfidenceStars({ level }: Props) {
  const filled = LEVEL_TO_FILLED[level];
  return (
    <span
      className="inline-flex items-center gap-1 text-xs text-white/70"
      aria-label={`自信度: ${LEVEL_LABEL[level]}`}
    >
      <span aria-hidden className="tracking-tight">
        {"★".repeat(filled)}
        <span className="text-white/20">{"★".repeat(TOTAL_STARS - filled)}</span>
      </span>
      <span className="text-white/50">{LEVEL_LABEL[level]}</span>
    </span>
  );
}

/** Exported for other components that want to render their own control. */
export { LEVEL_LABEL as CONFIDENCE_LABELS };
