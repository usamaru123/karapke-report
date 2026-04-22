import { formatScore } from "@/lib/format";

type Props = {
  value: number | string | null;
  size?: "sm" | "md" | "lg";
};

/**
 * Score tone tiers:
 *   98+   ゴールド + glow     — Heart ルーレット対象帯、マイルストーン
 *   95-98 neon-pink strong    — カンスト級、95% スイートスポット超
 *   90-95 neon-pink           — 公式 UI の「虹色」相当
 *   80-90 white               — 「金色」相当
 *   < 80  white/40            — 赤〜青〜無印
 */
function toneFor(n: number): string {
  if (n >= 98) return "text-neon-amber neon-text-amber";
  if (n >= 95) return "text-neon-pink neon-text-pink";
  if (n >= 90) return "text-neon-pink";
  if (n >= 80) return "text-white";
  return "text-white/40";
}

export function ScoreBadge({ value, size = "md" }: Props) {
  const n = value === null ? null : Number(value);
  const hasScore = n !== null && Number.isFinite(n);
  const tone = !hasScore ? "text-white/30" : toneFor(n!);

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
