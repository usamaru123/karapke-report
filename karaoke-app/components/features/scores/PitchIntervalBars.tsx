"use client";

import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Label,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Props = {
  intervals: number[] | null;
  /**
   * Ai sensitivity deduct points per section (24 values). Rendered as a
   * separate red bar GROUP next to each pitch bar (barGap-spaced) so the
   * two series don't overlap.
   */
  aiDeduct?: number[] | null;
};

function barColor(v: number): string {
  if (v >= 90) return "#ff2a8a";
  if (v >= 80) return "rgba(255,255,255,0.65)";
  if (v >= 70) return "rgba(255,255,255,0.4)";
  return "#f87171";
}

type Row = {
  section: number;
  pitch: number;
  deduct: number;
};

export function PitchIntervalBars({ intervals, aiDeduct }: Props) {
  if (intervals === null || intervals.length !== 24) {
    return (
      <p className="py-3 text-center text-xs text-white/40">
        区間別データが記録されていません (detailFlg=0 同期時など)。
      </p>
    );
  }

  const data: Row[] = intervals.map((v, i) => ({
    section: i + 1,
    pitch: v,
    deduct: aiDeduct?.[i] ?? 0,
  }));

  const mean = intervals.reduce((s, n) => s + n, 0) / intervals.length;
  let weakestIdx = 0;
  for (let i = 1; i < intervals.length; i++) {
    if (intervals[i] < intervals[weakestIdx]) weakestIdx = i;
  }

  return (
    <div>
      <div style={{ width: "100%", height: 240 }}>
        <ResponsiveContainer>
          <BarChart
            data={data}
            margin={{ top: 10, right: 8, bottom: 0, left: -10 }}
            barCategoryGap={aiDeduct ? 6 : 2}
            barGap={1}
          >
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="section"
              tick={{ fontSize: 10, fill: "rgba(255,255,255,0.55)" }}
              ticks={[1, 5, 10, 15, 20, 24]}
              tickFormatter={(v) => String(v)}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: "rgba(255,255,255,0.5)" }}
            />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.05)" }}
              contentStyle={{
                background: "#13132a",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 6,
                fontSize: 11,
              }}
              labelFormatter={(v) => `区間 ${v}/24`}
              formatter={(value, name) => {
                if (name === "pitch") return [value, "音程"];
                if (name === "deduct") return [value, "Ai 感性 減点"];
                return [value, name];
              }}
            />
            {aiDeduct && (
              <Legend
                wrapperStyle={{ fontSize: 10, color: "rgba(255,255,255,0.7)" }}
                formatter={(v) =>
                  v === "pitch" ? "音程" : v === "deduct" ? "Ai 感性 減点" : v
                }
              />
            )}
            <ReferenceLine
              y={mean}
              stroke="rgba(0,229,255,0.55)"
              strokeDasharray="4 4"
            >
              <Label
                value={`平均 ${mean.toFixed(1)}`}
                position="right"
                fill="rgba(0,229,255,0.8)"
                fontSize={10}
              />
            </ReferenceLine>
            <Bar dataKey="pitch" name="pitch">
              {data.map((d, i) => (
                <Cell
                  key={d.section}
                  fill={barColor(d.pitch)}
                  stroke={i === weakestIdx ? "#ffb300" : "transparent"}
                  strokeWidth={i === weakestIdx ? 1.5 : 0}
                />
              ))}
            </Bar>
            {aiDeduct && (
              <Bar
                dataKey="deduct"
                name="deduct"
                fill="rgba(248,113,113,0.85)"
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-[10px] text-white/50 tabular-nums">
        最低: 区間 {weakestIdx + 1} ({intervals[weakestIdx]}) / 全体平均 {mean.toFixed(1)}
      </p>
    </div>
  );
}
