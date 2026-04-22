import { formatScore } from "@/lib/format";

type Props = {
  value: number | string | null;
  size?: "sm" | "md" | "lg";
};

/**
 * Score tone tiers. Color alone is not a sufficient signal (color-blindness,
 * dark-room contrast) so each tier is paired with an `aria-label` suffix that
 * announces the band verbally:
 *
 *   98+   amber + glow         — "98点以上"
 *   95-98 neon-pink strong     — "95点以上"
 *   90-95 neon-pink            — "90点以上"
 *   80-90 white                — "80点以上"
 *   < 80  slate-300 (was       — "80点未満"
 *         white/40, too faint
 *         for dark rooms)
 */
function toneFor(n: number): string {
  if (n >= 98) return "text-neon-amber neon-text-amber";
  if (n >= 95) return "text-neon-pink neon-text-pink";
  if (n >= 90) return "text-neon-pink";
  if (n >= 80) return "text-white";
  // WCAG AA target: keep legible on #13132a bg_surface. slate-300 clocks
  // ~9:1 against it, still visibly "tried but didn't quite get there".
  return "text-slate-300";
}

function tierLabel(n: number): string {
  if (n >= 98) return "98点以上";
  if (n >= 95) return "95点以上";
  if (n >= 90) return "90点以上";
  if (n >= 80) return "80点以上";
  return "80点未満";
}

export function ScoreBadge({ value, size = "md" }: Props) {
  const n = value === null ? null : Number(value);
  const hasScore = n !== null && Number.isFinite(n);
  const tone = !hasScore ? "text-white/30" : toneFor(n!);

  const sizeCls =
    size === "lg" ? "text-3xl" : size === "sm" ? "text-lg" : "text-2xl";

  const ariaLabel = hasScore
    ? `${formatScore(value)} 点 (${tierLabel(n!)})`
    : "得点なし";

  return (
    <span
      className={`${tone} ${sizeCls} tabular-nums font-semibold`}
      aria-label={ariaLabel}
    >
      {formatScore(value)}
    </span>
  );
}
