import { formatScore } from "@/lib/format";

type Props = {
  value: number | string | null;
  size?: "sm" | "md" | "lg";
};

// 90+ : neon-pink glow / 80-90 : white / <80 : dimmed
export function ScoreBadge({ value, size = "md" }: Props) {
  const n = value === null ? null : Number(value);
  const hasScore = n !== null && Number.isFinite(n);
  const tone = !hasScore
    ? "text-white/30"
    : n! >= 90
      ? "text-neon-pink neon-text-pink"
      : n! >= 80
        ? "text-white"
        : "text-white/40";

  const sizeCls =
    size === "lg"
      ? "text-3xl"
      : size === "sm"
        ? "text-lg"
        : "text-2xl";

  return (
    <span className={`${tone} ${sizeCls} tabular-nums font-semibold`}>
      {formatScore(value)}
    </span>
  );
}
