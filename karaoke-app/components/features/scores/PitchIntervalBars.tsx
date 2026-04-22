"use client";

import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Label,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Props = {
  intervals: number[] | null;
  /**
   * Ai sensitivity deduct points per section (24 values). When provided, a
   * second red bar is overlaid so the user can see where AI-sensitivity
   * points were lost in addition to pitch weakness.
   */
  aiDeduct?: number[] | null;
};

function barColor(v: number): string {
  if (v >= 90) return "#ff2a8a"; // neon-pink
  if (v >= 80) return "rgba(255,255,255,0.65)";
  if (v >= 70) return "rgba(255,255,255,0.4)";
  return "#f87171"; // red-400
}

type Row = {
  section: string;
  pitch: number;
  deduct: number | null;
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
    section: String(i + 1),
    pitch: v,
    deduct: aiDeduct?.[i] ?? null,
  }));

  const mean = intervals.reduce((s, n) => s + n, 0) / intervals.length;
  let weakestIdx = 0;
  for (let i = 1; i < intervals.length; i++) {
    if (intervals[i] < intervals[weakestIdx]) weakestIdx = i;
  }

  return (
    <div>
      <div style={{ width: "100%", height: 180 }}>
        <ResponsiveContainer>
          <BarChart
            data={data}
            margin={{ top: 6, right: 0, bottom: 0, left: -20 }}
            barCategoryGap={1}
          >
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="section"
              tick={{ fontSize: 9, fill: "rgba(255,255,255,0.5)" }}
              interval={1}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: "rgba(255,255,255,0.5)" }}
            />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.05)" }}
              contentStyle={{
                background: "#13132a",
                border: "1px solid rgba(255,255,255,0.1)",
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
            <ReferenceLine
              y={mean}
              stroke="rgba(0,229,255,0.5)"
              strokeDasharray="3 3"
            >
              <Label
                value={`平均 ${mean.toFixed(1)}`}
                position="right"
                fill="rgba(0,229,255,0.8)"
                fontSize={9}
              />
            </ReferenceLine>
            <Bar dataKey="pitch">
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
              <Bar dataKey="deduct" fill="rgba(248,113,113,0.55)" />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-[10px] text-white/40 tabular-nums">
        最低 区間 {weakestIdx + 1}: {intervals[weakestIdx]} / 平均 {mean.toFixed(1)}
        {aiDeduct ? " ｜ 赤バー = Ai 感性 減点" : ""}
      </p>
    </div>
  );
}
