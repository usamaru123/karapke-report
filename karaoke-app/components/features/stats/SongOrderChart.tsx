"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SongOrderPerformance } from "@/lib/queries/stats";

type Props = { data: SongOrderPerformance };

/**
 * "Warmup curve": mean total_score by song-position-within-session.
 *
 * - x: 1, 2, 3, ... (up to maxPosition, usually 10)
 * - y: mean score
 * - Faded bars mark positions with sample size < 3 (not enough data to trust)
 * - Peak position drawn in neon-pink, others cyan
 * - Overall mean shown as reference line
 * - Tooltip surfaces median + max + sample count
 */
export function SongOrderChart({ data }: Props) {
  const { points, peakPosition, includedSessionCount } = data;

  if (points.length === 0) {
    return (
      <p className="py-6 text-center text-xs text-white/50">
        2 曲以上歌ったセッションがまだありません。
      </p>
    );
  }

  // Overall mean across all position means, weighted by sample size.
  // Used as a reference line so the reader can tell "this position is above
  // my usual level" at a glance.
  const totalSamples = points.reduce((a, p) => a + p.sampleSize, 0);
  const overallMean =
    totalSamples > 0
      ? points.reduce((a, p) => a + p.mean * p.sampleSize, 0) / totalSamples
      : 0;

  // Chart bounds: pad 2 below min, ceil at 100.
  const minMean = Math.min(...points.map((p) => p.mean));
  const maxMean = Math.max(...points.map((p) => p.mean));
  const yMin = Math.max(0, Math.floor(minMean) - 2);
  const yMax = Math.min(100, Math.ceil(maxMean) + 1);

  const chartData = points.map((p) => ({
    position: p.position,
    mean: Number(p.mean.toFixed(2)),
    median: Number(p.median.toFixed(2)),
    max: p.max,
    sample: p.sampleSize,
    isPeak: peakPosition?.position === p.position,
    isLowSample: p.sampleSize < 3,
  }));

  return (
    <div>
      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer>
          <BarChart
            data={chartData}
            margin={{ top: 8, right: 8, bottom: 4, left: -12 }}
          >
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="position"
              tick={{ fontSize: 10, fill: "rgba(255,255,255,0.6)" }}
              tickFormatter={(v) => `${v}曲目`}
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fontSize: 10, fill: "rgba(255,255,255,0.5)" }}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const p = payload[0].payload as (typeof chartData)[number];
                return (
                  <div
                    style={{
                      background: "#13132a",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 6,
                      padding: "6px 10px",
                      fontSize: 11,
                      color: "rgba(255,255,255,0.9)",
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{p.position} 曲目</div>
                    <div>平均: {p.mean.toFixed(2)} 点</div>
                    <div>中央値: {p.median.toFixed(2)} 点</div>
                    <div>最高: {p.max.toFixed(2)} 点</div>
                    <div style={{ color: "rgba(255,255,255,0.5)" }}>
                      N = {p.sample}
                    </div>
                  </div>
                );
              }}
            />
            <ReferenceLine
              y={overallMean}
              stroke="rgba(255,255,255,0.35)"
              strokeDasharray="3 3"
            >
              <Label
                value={`全体平均 ${overallMean.toFixed(1)}`}
                position="right"
                fill="rgba(255,255,255,0.45)"
                fontSize={10}
              />
            </ReferenceLine>
            <Bar dataKey="mean" radius={[4, 4, 0, 0]}>
              {chartData.map((d) => {
                // Faded for low-sample positions, peak highlighted in pink.
                const color = d.isLowSample
                  ? "rgba(0, 229, 255, 0.22)"
                  : d.isPeak
                    ? "#ff2a8a"
                    : "#00e5ff";
                return <Cell key={d.position} fill={color} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 space-y-1 px-1 text-xs text-white/60">
        {peakPosition ? (
          <p>
            <span className="text-white/40">調子のピーク: </span>
            <span className="font-semibold text-neon-pink">
              {peakPosition.position} 曲目
            </span>
            <span className="tabular-nums">
              {" "}
              (平均 {peakPosition.mean.toFixed(2)} 点 · N={peakPosition.sampleSize})
            </span>
          </p>
        ) : (
          <p className="text-white/50">
            ピーク判定にはサンプル 3 以上の曲順が必要です。
          </p>
        )}
        <p className="text-white/40">
          対象セッション: {includedSessionCount} 件 (2 曲以上のもの)
        </p>
        {chartData.some((d) => d.isLowSample) && (
          <p className="text-white/40">
            薄い色のバー = サンプル 3 未満 (参考値)
          </p>
        )}
      </div>
    </div>
  );
}
