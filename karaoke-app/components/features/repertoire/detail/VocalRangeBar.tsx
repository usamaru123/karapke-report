import { VocalRangeBadge } from "@/components/ui/VocalRangeBadge";
import {
  midiToNoteName,
  midiToPercent,
  RANGE_BAR_MAX_MIDI,
  RANGE_BAR_MIN_MIDI,
} from "@/lib/midi";
import { evaluateVocalRange } from "@/lib/vocal-range";

type Props = {
  songLow: number | null;
  songHigh: number | null;
  /** Aggregate min across user's score history. */
  mineLow: number | null;
  /** Aggregate max across user's score history. */
  mineHigh: number | null;
  /** Sample size (# scores contributing) — shown to temper the range with context. */
  sampleSize?: number;
};

const LABEL_MIDI = [36, 48, 60, 72, 84]; // C2, C3, C4, C5, C6

function Bar({
  low,
  high,
  color,
  label,
}: {
  low: number | null;
  high: number | null;
  color: string;
  label: string;
}) {
  if (low === null || high === null || high <= low) {
    return (
      <div className="flex items-center gap-3 text-xs text-white/50">
        <span className="shrink-0 w-20">{label}:</span>
        <span>未測定</span>
      </div>
    );
  }
  const leftPct = midiToPercent(low, RANGE_BAR_MIN_MIDI, RANGE_BAR_MAX_MIDI);
  const widthPct =
    midiToPercent(high, RANGE_BAR_MIN_MIDI, RANGE_BAR_MAX_MIDI) - leftPct;
  return (
    <div className="flex items-center gap-3">
      <span className="shrink-0 w-20 text-xs text-white/60">{label}:</span>
      <div className="relative h-6 flex-1 rounded border border-white/10 bg-bg-elevated">
        <div
          className={`absolute top-0 h-full rounded ${color}`}
          style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 1.5)}%` }}
        />
      </div>
      <span className="shrink-0 w-24 text-right text-xs tabular-nums text-white/80">
        {midiToNoteName(low)} 〜 {midiToNoteName(high)}
      </span>
    </div>
  );
}

export function VocalRangeBar({
  songLow,
  songHigh,
  mineLow,
  mineHigh,
  sampleSize,
}: Props) {
  const hasAny =
    (songLow !== null && songHigh !== null) ||
    (mineLow !== null && mineHigh !== null);

  const verdict = evaluateVocalRange(
    { low: songLow, high: songHigh },
    { low: mineLow, high: mineHigh },
  );

  return (
    <section className="px-4 py-2">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-white/50">
          音域
        </h3>
        <VocalRangeBadge verdict={verdict} size="md" />
      </div>
      {!hasAny ? (
        <p className="text-sm text-white/60">
          未測定（歌うと自動で記録されます）
        </p>
      ) : (
        <div className="space-y-3">
          <Bar
            low={songLow}
            high={songHigh}
            label="曲の音域"
            color="bg-gradient-to-r from-neon-purple to-neon-pink opacity-80"
          />
          <Bar
            low={mineLow}
            high={mineHigh}
            label="自分の声域"
            color="bg-neon-cyan/70"
          />
          {/* Note name scale under the bars */}
          <div className="flex items-center gap-3">
            <span className="shrink-0 w-20" />
            <div className="relative h-4 flex-1">
              {LABEL_MIDI.map((m) => {
                const pct = midiToPercent(
                  m,
                  RANGE_BAR_MIN_MIDI,
                  RANGE_BAR_MAX_MIDI,
                );
                return (
                  <span
                    key={m}
                    className="absolute top-0 -translate-x-1/2 text-[10px] text-white/35"
                    style={{ left: `${pct}%` }}
                  >
                    {midiToNoteName(m)}
                  </span>
                );
              })}
            </div>
            <span className="shrink-0 w-24" />
          </div>
          {typeof sampleSize === "number" && sampleSize > 0 && (
            <p className="pl-20 text-[10px] text-white/40">
              自分の声域は過去 {sampleSize} 回の歌唱から推定
            </p>
          )}
        </div>
      )}
    </section>
  );
}
