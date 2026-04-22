"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";

type Props = {
  pitch: number | null;
  stability: number | null;
  expression: number | null;
  vibratoLongtone: number | null;
  rhythm: number | null;
};

type Axis = { subject: string; value: number; raw: number | null };

type TickAnchor = "start" | "middle" | "end" | "inherit";

/**
 * Axis tick rendered as "音程 / 83" so users see the actual score.
 * Recharts passes props loosely — accept them as unknown and coerce to the
 * shape we need.
 */
function labeledTick(data: Axis[]) {
  return function Tick(raw: unknown) {
    const p = (raw as {
      x?: number | string;
      y?: number | string;
      payload?: { value?: string };
      textAnchor?: string;
    }) ?? {};
    const nx = typeof p.x === "number" ? p.x : Number(p.x) || 0;
    const ny = typeof p.y === "number" ? p.y : Number(p.y) || 0;
    const label = p.payload?.value ?? "";
    const entry = data.find((d) => d.subject === label);
    const scoreLabel = entry?.raw === null ? "—" : String(entry?.raw ?? 0);
    const a = p.textAnchor;
    const anchor: TickAnchor =
      a === "start" || a === "end" || a === "inherit" ? a : "middle";
    return (
      <text
        x={nx}
        y={ny}
        textAnchor={anchor}
        fill="rgba(255,255,255,0.75)"
        fontSize={11}
      >
        <tspan x={nx} dy={0}>
          {label}
        </tspan>
        <tspan x={nx} dy={13} fontSize={11} fontWeight={600} fill="#00e5ff">
          {scoreLabel}
        </tspan>
      </text>
    );
  };
}

export function ScoreRadarChart({
  pitch,
  stability,
  expression,
  vibratoLongtone,
  rhythm,
}: Props) {
  const data: Axis[] = [
    { subject: "音程", value: Number(pitch ?? 0), raw: pitch },
    { subject: "安定性", value: Number(stability ?? 0), raw: stability },
    { subject: "表現力", value: Number(expression ?? 0), raw: expression },
    {
      subject: "V&L",
      value: Number(vibratoLongtone ?? 0),
      raw: vibratoLongtone,
    },
    { subject: "リズム", value: Number(rhythm ?? 0), raw: rhythm },
  ];
  return (
    <div className="h-[280px] w-full" aria-label="採点レーダーチャート">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="68%">
          <PolarGrid stroke="rgba(255,255,255,0.12)" />
          <PolarAngleAxis dataKey="subject" tick={labeledTick(data)} />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            dataKey="value"
            stroke="#00e5ff"
            fill="#00e5ff"
            fillOpacity={0.3}
            isAnimationActive={false}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
