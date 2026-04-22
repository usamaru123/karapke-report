"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlyTrendPoint } from "@/lib/queries/stats";

type Props = { points: MonthlyTrendPoint[] };

/**
 * 12-month trend: bar = count, line = average score.
 * Dual axes so count (0..N) and average (50..100) each have room.
 */
export function MonthlyTrendChart({ points }: Props) {
  if (points.length === 0) {
    return (
      <p className="py-6 text-center text-xs text-white/50">
        データが足りません。
      </p>
    );
  }
  const data = points.map((p) => ({
    month: p.month.slice(5), // "MM"
    count: p.count,
    avg: p.avg,
  }));

  return (
    <div style={{ width: "100%", height: 220 }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 8, right: 0, bottom: 0, left: -10 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="month" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.6)" }} />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 10, fill: "rgba(255,255,255,0.5)" }}
            allowDecimals={false}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[50, 100]}
            tick={{ fontSize: 10, fill: "rgba(255,255,255,0.5)" }}
          />
          <Tooltip
            contentStyle={{
              background: "#13132a",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 6,
              fontSize: 11,
            }}
            labelStyle={{ color: "rgba(255,255,255,0.8)" }}
          />
          <Legend
            wrapperStyle={{ fontSize: 10, color: "rgba(255,255,255,0.6)" }}
          />
          <Bar
            yAxisId="left"
            dataKey="count"
            name="歌唱回数"
            fill="rgba(255, 42, 138, 0.55)"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="avg"
            name="平均点"
            stroke="#00e5ff"
            strokeWidth={2}
            dot={{ r: 3, fill: "#00e5ff" }}
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
