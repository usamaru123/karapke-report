import Link from "next/link";
import { Sparkline } from "@/components/ui/Sparkline";
import type { DashboardSummary } from "@/lib/queries/dashboard";
import type { KpiTrendPoint } from "@/lib/queries/stats";

type Props = {
  summary: DashboardSummary;
  /** Optional last-N-month trend. When present each tile shows a sparkline. */
  trend?: KpiTrendPoint[];
};

type Tile = {
  label: string;
  value: string;
  unit: string;
  href: string;
  /** Numeric series aligned with `trend` months. Plotted under the value. */
  series: number[];
  /** Bigger-is-better for color; false = smaller-is-better. */
  higherIsBetter: boolean;
};

export function KpiGrid({ summary, trend }: Props) {
  // Coerce trend series — treat null `averageScore` as 0 (months with no
  // singing would otherwise leave a gap). Fine for a sparkline trendline.
  const months = trend ?? [];
  const repSeries = months.map((m) => m.repertoireCount);
  const countSeries = months.map((m) => m.totalScoreCount);
  const avgSeries = months.map((m) => m.averageScore ?? 0);
  const highSeries = months.map((m) => m.highScoreSongCount);

  const tiles: Tile[] = [
    {
      label: "レパ",
      value: summary.repertoireCount.toString(),
      unit: "曲",
      href: "/repertoire",
      series: repSeries,
      higherIsBetter: true,
    },
    {
      label: "総歌唱",
      value: summary.totalScoreCount.toString(),
      unit: "回",
      href: "/history",
      series: countSeries,
      higherIsBetter: true,
    },
    {
      label: "平均点",
      value:
        summary.averageScore !== null
          ? summary.averageScore.toFixed(1)
          : "—",
      unit: "点",
      href: "/history",
      series: avgSeries,
      higherIsBetter: true,
    },
    {
      label: "90+ 達成",
      value: summary.highScoreSongCount.toString(),
      unit: "曲",
      href: "/repertoire?filter=over90",
      series: highSeries,
      higherIsBetter: true,
    },
  ];

  return (
    <section className="grid grid-cols-2 gap-3" aria-label="主要指標">
      {tiles.map((t) => {
        // Month-over-month delta drives the tile's accent color.
        const delta =
          t.series.length >= 2
            ? t.series[t.series.length - 1] - t.series[t.series.length - 2]
            : 0;
        const trendGood = t.higherIsBetter ? delta >= 0 : delta <= 0;
        const stroke = trendGood ? "#34d399" : "#f87171";
        const deltaLabel =
          t.series.length >= 2 && delta !== 0
            ? `${delta > 0 ? "+" : ""}${t.label === "平均点" ? delta.toFixed(1) : delta}`
            : null;

        return (
          <Link
            key={t.label}
            href={t.href}
            className="flex flex-col rounded-xl border border-white/10 bg-bg-surface p-4 transition-colors hover:border-white/25 hover:bg-bg-elevated"
          >
            <span className="flex items-center justify-between text-xs text-white/50">
              <span>{t.label}</span>
              {deltaLabel && (
                <span
                  className="tabular-nums"
                  style={{ color: trendGood ? "#34d399" : "#f87171" }}
                >
                  {deltaLabel}
                </span>
              )}
            </span>
            <span className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-semibold tabular-nums text-white">
                {t.value}
              </span>
              <span className="text-xs text-white/60">{t.unit}</span>
            </span>
            {t.series.length >= 2 && (
              <div className="mt-2">
                <Sparkline
                  values={t.series}
                  width={120}
                  height={22}
                  stroke={stroke}
                  ariaLabel={`${t.label} ${t.series.length} ヶ月推移`}
                />
              </div>
            )}
          </Link>
        );
      })}
    </section>
  );
}
