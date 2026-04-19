"use client";

import { format } from "date-fns";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Point = { sung_at: string; total_score: number };
type Props = { points: Point[] };

export function ScoreHistoryChart({ points }: Props) {
  if (points.length === 0) {
    return (
      <p className="px-4 text-sm text-white/50">歌唱履歴がありません。</p>
    );
  }

  const data = points
    .slice()
    .sort((a, b) => a.sung_at.localeCompare(b.sung_at))
    .map((p) => ({
      label: format(new Date(p.sung_at), "M/d"),
      score: Number(p.total_score),
    }));

  const scores = data.map((d) => d.score);
  const minScore = Math.floor(Math.min(...scores) - 2);
  const maxScore = Math.ceil(Math.max(...scores) + 2);

  return (
    <div className="h-[180px] w-full" aria-label="歌唱推移">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 10, right: 20, bottom: 10, left: 0 }}
        >
          <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }}
            axisLine={{ stroke: "rgba(255,255,255,0.12)" }}
          />
          <YAxis
            domain={[minScore, maxScore]}
            tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }}
            axisLine={{ stroke: "rgba(255,255,255,0.12)" }}
            width={36}
          />
          <Tooltip
            contentStyle={{
              background: "#13132a",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 6,
              fontSize: 12,
            }}
            labelStyle={{ color: "rgba(255,255,255,0.8)" }}
            itemStyle={{ color: "#ff2a8a" }}
            formatter={(v) => [typeof v === "number" ? v.toFixed(3) : String(v), "点"]}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#ff2a8a"
            strokeWidth={2}
            dot={{ fill: "#ff2a8a", r: 3 }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
