import { ArrowRight, Minus, TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";
import type { MonthlySummary } from "@/lib/queries/stats";

type Props = { summary: MonthlySummary };

function formatDelta(
  delta: number | null,
  unit: string,
): { icon: typeof Minus; color: string; label: string } {
  if (delta === null) {
    return { icon: Minus, color: "text-white/40", label: "—" };
  }
  if (Math.abs(delta) < 0.05) {
    return { icon: Minus, color: "text-white/40", label: "±0" };
  }
  const sign = delta > 0 ? "+" : "";
  const rounded =
    Math.abs(delta) >= 10
      ? delta.toFixed(0)
      : delta.toFixed(1).replace(/\.0$/, "");
  return {
    icon: delta > 0 ? TrendingUp : TrendingDown,
    color: delta > 0 ? "text-neon-green" : "text-red-300",
    label: `${sign}${rounded}${unit}`,
  };
}

export function MonthlySummaryCard({ summary }: Props) {
  const cur = summary.current;
  const dCount = formatDelta(summary.delta?.count ?? null, "");
  const dAvg = formatDelta(summary.delta?.avg ?? null, "");
  const dBest = formatDelta(summary.delta?.best ?? null, "");

  const items: Array<{
    label: string;
    value: string;
    delta: ReturnType<typeof formatDelta>;
  }> = [
    {
      label: "歌唱回数",
      value: cur.count.toString(),
      delta: dCount,
    },
    {
      label: "平均点",
      value: cur.avg !== null ? cur.avg.toFixed(1) : "—",
      delta: dAvg,
    },
    {
      label: "自己ベスト",
      value: cur.best !== null ? cur.best.toFixed(2) : "—",
      delta: dBest,
    },
  ];

  return (
    <section className="rounded-xl border border-white/10 bg-bg-surface p-4">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-white/50">
          今月のまとめ (先月比)
        </h2>
        <Link
          href="/stats"
          className="inline-flex items-center gap-1 text-xs text-neon-cyan hover:underline"
        >
          詳細
          <ArrowRight size={12} />
        </Link>
      </header>
      <div className="grid grid-cols-3 gap-3">
        {items.map((it) => {
          const DeltaIcon = it.delta.icon;
          return (
            <div
              key={it.label}
              className="rounded-lg border border-white/5 bg-bg-elevated p-2.5 text-center"
            >
              <p className="text-[10px] text-white/50">{it.label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-white">
                {it.value}
              </p>
              <p
                className={`mt-0.5 inline-flex items-center gap-0.5 text-[10px] tabular-nums ${it.delta.color}`}
              >
                <DeltaIcon size={10} />
                {it.delta.label}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
