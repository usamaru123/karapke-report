import type { Confidence, SourceLabel } from "@/lib/advice/types";

type Props = {
  source: SourceLabel;
  confidence: Confidence;
};

/**
 * Shows the origin of a Finding so the user can calibrate how much to trust
 * it. Mapping:
 *   official  → green   (公式・特許)
 *   empirical → amber   (有志実測)
 *   inferred  → cyan    (推定)
 *
 * Confidence is shown only for inferred/empirical (low/medium) to keep the
 * chip line short — `official + high` is the implicit default.
 */
export function SourceBadge({ source, confidence }: Props) {
  const sourceMap: Record<SourceLabel, { label: string; className: string }> = {
    official: {
      label: "公式",
      className: "border-neon-green/40 bg-neon-green/10 text-neon-green",
    },
    empirical: {
      label: "実測",
      className: "border-neon-amber/40 bg-neon-amber/10 text-neon-amber",
    },
    inferred: {
      label: "推定",
      className: "border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan",
    },
  };
  const s = sourceMap[source];
  const showConfidence =
    source !== "official" && (confidence === "low" || confidence === "medium");
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${s.className}`}
      >
        {s.label}
      </span>
      {showConfidence && (
        <span className="text-[10px] text-white/40">
          確度 {confidence === "low" ? "低" : "中"}
        </span>
      )}
    </span>
  );
}
