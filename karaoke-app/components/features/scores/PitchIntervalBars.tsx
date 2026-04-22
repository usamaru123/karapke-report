/**
 * Tiny 24-bar mini chart for the per-section pitch scores.
 * Rendered as horizontal CSS bars so we don't pull in recharts for 24 values.
 */

type Props = {
  intervals: number[] | null;
};

const BAR_HEIGHT = 48; // px

function barColor(value: number): string {
  if (value >= 90) return "bg-neon-pink";
  if (value >= 80) return "bg-white/70";
  if (value >= 70) return "bg-white/40";
  return "bg-red-400/70";
}

export function PitchIntervalBars({ intervals }: Props) {
  if (intervals === null || intervals.length !== 24) {
    return (
      <p className="py-3 text-center text-xs text-white/40">
        区間別データが記録されていません (detailFlg=0 同期時など)。
      </p>
    );
  }

  const mean =
    intervals.reduce((s, n) => s + n, 0) / intervals.length;
  let weakestIdx = 0;
  for (let i = 1; i < intervals.length; i++) {
    if (intervals[i] < intervals[weakestIdx]) weakestIdx = i;
  }

  return (
    <div>
      <div
        className="flex items-end gap-[2px]"
        style={{ height: BAR_HEIGHT }}
      >
        {intervals.map((v, i) => {
          const pct = Math.max(0, Math.min(100, v));
          const highlight = i === weakestIdx;
          return (
            <div
              key={i}
              className="relative flex-1"
              title={`区間 ${i + 1}: ${v}`}
            >
              <div
                className={`absolute bottom-0 w-full ${barColor(v)} ${
                  highlight ? "ring-1 ring-neon-amber" : ""
                }`}
                style={{ height: `${pct}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[9px] text-white/30 tabular-nums">
        <span>区間 1</span>
        <span>平均 {mean.toFixed(1)}</span>
        <span>最低 区間 {weakestIdx + 1} ({intervals[weakestIdx]})</span>
        <span>区間 24</span>
      </div>
    </div>
  );
}
