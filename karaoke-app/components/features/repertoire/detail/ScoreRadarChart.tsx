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

export function ScoreRadarChart({
  pitch,
  stability,
  expression,
  vibratoLongtone,
  rhythm,
}: Props) {
  const data = [
    { subject: "音程", value: Number(pitch ?? 0) },
    { subject: "安定性", value: Number(stability ?? 0) },
    { subject: "表現力", value: Number(expression ?? 0) },
    { subject: "ビブラート&ロングトーン", value: Number(vibratoLongtone ?? 0) },
    { subject: "リズム", value: Number(rhythm ?? 0) },
  ];
  return (
    <div className="h-[260px] w-full" aria-label="採点レーダーチャート">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="70%">
          <PolarGrid stroke="rgba(255,255,255,0.12)" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 11 }}
          />
          <PolarRadiusAxis
            domain={[0, 100]}
            tick={false}
            axisLine={false}
          />
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
