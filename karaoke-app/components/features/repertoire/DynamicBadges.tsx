import type { RepertoireWithMeta } from "@/lib/queries/repertoire";

type Props = { item: RepertoireWithMeta };

/**
 * Contextual badges that point the user toward action:
 * - "あと N 点でベスト"  → recent score is within 2 pts of the all-time best
 * - "N 日歌ってない"      → last sung more than 30 days ago
 *
 * Kept as a small standalone component so both the list card and (later) the
 * detail header can reuse it.
 */
export function DynamicBadges({ item }: Props) {
  const badges: { label: string; tone: "amber" | "cyan" | "muted" }[] = [];

  const recent = item.recent_scores[item.recent_scores.length - 1];
  const best = item.best_score;
  if (typeof recent === "number" && typeof best === "number" && best > recent) {
    const gap = best - recent;
    if (gap <= 2) {
      // rounded to 1 decimal to match badge labeling elsewhere
      badges.push({
        label: `あと ${gap.toFixed(1)} 点でベスト`,
        tone: "amber",
      });
    }
  }

  if (
    typeof item.days_since_last_sung === "number" &&
    item.days_since_last_sung >= 30
  ) {
    badges.push({
      label: `${item.days_since_last_sung} 日歌ってない`,
      tone: "muted",
    });
  }

  if (badges.length === 0) return null;

  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      {badges.map((b) => (
        <span
          key={b.label}
          className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
            b.tone === "amber"
              ? "border-neon-amber/40 bg-neon-amber/10 text-neon-amber"
              : b.tone === "cyan"
                ? "border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan"
                : "border-white/15 bg-white/[0.03] text-white/50"
          }`}
        >
          {b.label}
        </span>
      ))}
    </div>
  );
}
