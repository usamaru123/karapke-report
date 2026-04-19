import Link from "next/link";
import type { DashboardSummary } from "@/lib/queries/dashboard";

type Props = { summary: DashboardSummary };

type Tile = {
  label: string;
  value: string;
  unit: string;
  href: string;
};

export function KpiGrid({ summary }: Props) {
  const tiles: Tile[] = [
    {
      label: "レパ",
      value: summary.repertoireCount.toString(),
      unit: "曲",
      href: "/repertoire",
    },
    {
      label: "総歌唱",
      value: summary.totalScoreCount.toString(),
      unit: "回",
      href: "/history",
    },
    {
      label: "平均点",
      value:
        summary.averageScore !== null
          ? summary.averageScore.toFixed(1)
          : "—",
      unit: "点",
      href: "/history",
    },
    {
      label: "90+ 達成",
      value: summary.highScoreSongCount.toString(),
      unit: "曲",
      href: "/repertoire?filter=over90",
    },
  ];

  return (
    <section
      className="grid grid-cols-2 gap-3"
      aria-label="主要指標"
    >
      {tiles.map((t) => (
        <Link
          key={t.label}
          href={t.href}
          className="flex flex-col rounded-xl border border-white/10 bg-bg-surface p-4 transition-colors hover:border-white/25 hover:bg-bg-elevated"
        >
          <span className="text-xs text-white/50">{t.label}</span>
          <span className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-semibold tabular-nums text-white">
              {t.value}
            </span>
            <span className="text-xs text-white/60">{t.unit}</span>
          </span>
        </Link>
      ))}
    </section>
  );
}
