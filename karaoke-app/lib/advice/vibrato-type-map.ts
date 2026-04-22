/**
 * Decode DAM's `vibratoType` numeric code into the 15-class vocal-vibrato
 * taxonomy documented in the provided knowledge report (see
 * docs/feature-design/advice-engine.md §3.1).
 *
 * CONFIDENCE: medium. The mapping below is a **hypothesis** derived from
 * 5 real records (2026-04-22 API pull):
 *
 *   vibratoType=1  skill=5 totSec=20 → A-1 hypothesis (fast/shallow)
 *   vibratoType=2  skill=5 totSec=33 → A-2
 *   vibratoType=10 skill=3 totSec=20 → D  (non-box)
 *   vibratoType=13 skill=0 totSec=7  → G  (non-box, failed B-3 shape)
 *   vibratoType=13 skill=6 totSec=41 → G  (same shape, better sustain)
 *
 * Consistent with the 15-class taxonomy (3 box-period × 3 amplitude-depth
 * = 9, plus D E F G H non-box = 5, plus N no-vibrato = 1). Mapping:
 *
 *   0  → N     (no vibrato detected — placement as 0 or 15 is unresolved)
 *   1  → A-1   (fastest period, shallowest)
 *   2  → A-2
 *   3  → A-3
 *   4  → B-1
 *   5  → B-2
 *   6  → B-3    ← high-score sweet spot per knowledge
 *   7  → C-1
 *   8  → C-2
 *   9  → C-3    ← high-score sweet spot per knowledge
 *   10 → D     (non-box)
 *   11 → E
 *   12 → F
 *   13 → G
 *   14 → H
 *
 * OPEN QUESTIONS (to resolve by looking at a larger sample):
 *   - Is `0` truly "N" (no vibrato) or does N live at 15?
 *   - Do codes > 14 ever appear?
 *
 * When future data contradicts this map, update it here and adjust the
 * Vitest fixtures in tests/advice/vibrato-type-map.test.ts.
 */

export type VibratoLabel =
  | "N"
  | "A-1"
  | "A-2"
  | "A-3"
  | "B-1"
  | "B-2"
  | "B-3"
  | "C-1"
  | "C-2"
  | "C-3"
  | "D"
  | "E"
  | "F"
  | "G"
  | "H";

export type VibratoPeriod = "short" | "medium" | "long" | "non-box" | "none";
export type VibratoDepth = 1 | 2 | 3 | null;

export type VibratoTypeInfo = {
  label: VibratoLabel;
  /** Rough period class for messaging. */
  period: VibratoPeriod;
  /** Depth for the A/B/C rows; null for non-box and N. */
  depth: VibratoDepth;
  /** Whether this type is considered a sweet-spot for high scoring. */
  isRecommended: boolean;
};

const MAP: Record<number, VibratoTypeInfo> = {
  0: { label: "N", period: "none", depth: null, isRecommended: false },
  1: { label: "A-1", period: "short", depth: 1, isRecommended: false },
  2: { label: "A-2", period: "short", depth: 2, isRecommended: false },
  3: { label: "A-3", period: "short", depth: 3, isRecommended: false },
  4: { label: "B-1", period: "medium", depth: 1, isRecommended: false },
  5: { label: "B-2", period: "medium", depth: 2, isRecommended: false },
  6: { label: "B-3", period: "medium", depth: 3, isRecommended: true },
  7: { label: "C-1", period: "long", depth: 1, isRecommended: false },
  8: { label: "C-2", period: "long", depth: 2, isRecommended: false },
  9: { label: "C-3", period: "long", depth: 3, isRecommended: true },
  10: { label: "D", period: "non-box", depth: null, isRecommended: false },
  11: { label: "E", period: "non-box", depth: null, isRecommended: false },
  12: { label: "F", period: "non-box", depth: null, isRecommended: false },
  13: { label: "G", period: "non-box", depth: null, isRecommended: false },
  14: { label: "H", period: "non-box", depth: null, isRecommended: false },
};

/**
 * Resolve a numeric vibratoType to its structured label.
 * Returns null for unknown codes (so the caller can fall back to showing the
 * raw number rather than silently mislabeling).
 */
export function resolveVibratoType(
  code: number | null,
): VibratoTypeInfo | null {
  if (code === null || code === undefined) return null;
  if (!Number.isFinite(code)) return null;
  const key = Math.trunc(code);
  return MAP[key] ?? null;
}

/**
 * Japanese summary one-liner for the advice UI. Intentionally short.
 */
export function describeVibratoType(code: number | null): string {
  const info = resolveVibratoType(code);
  if (info === null) {
    return code === null ? "未計測" : `不明 (code=${code})`;
  }
  if (info.label === "N") return "ノンビブ (1 秒未満)";
  if (info.period === "non-box") {
    return `${info.label} (非ボックス型 — ボックス判定失敗の可能性)`;
  }
  const depthWord = info.depth === 3 ? "深" : info.depth === 2 ? "中" : "浅";
  const periodWord =
    info.period === "short"
      ? "速"
      : info.period === "medium"
        ? "中"
        : "遅";
  const recommended = info.isRecommended ? " (高得点帯)" : "";
  return `${info.label} — 周期${periodWord} / 振幅${depthWord}${recommended}`;
}
