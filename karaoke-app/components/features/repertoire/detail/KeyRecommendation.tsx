import { ArrowRight, Sparkles } from "lucide-react";
import { formatKey } from "@/lib/format";
import {
  formatKeyDelta,
  type KeyRecommendation as Recommendation,
} from "@/lib/key-recommendation";

type Props = {
  recommendation: Recommendation;
  currentPreferredKey: number;
};

export function KeyRecommendation({
  recommendation,
  currentPreferredKey,
}: Props) {
  if (recommendation.kind === "none") {
    if (recommendation.stats.length === 0) return null;
    return (
      <section className="mx-4 mt-4 rounded-xl border border-white/10 bg-bg-surface p-3">
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-white/50">
          おすすめ KEY
        </h3>
        <p className="text-xs text-white/50">
          サンプル不足 (各 KEY 1 回ずつ)。同じ KEY で 2 回以上歌うとおすすめを提示できます。
        </p>
        <StatsTable stats={recommendation.stats} currentKey={currentPreferredKey} />
      </section>
    );
  }

  const { bestKey, best, stats } = recommendation;
  const matchesPreferred = bestKey === currentPreferredKey;

  return (
    <section className="mx-4 mt-4 rounded-xl border border-white/10 bg-bg-surface p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-white/50">
          おすすめ KEY
        </h3>
        {matchesPreferred ? (
          <span className="flex items-center gap-1 rounded-full border border-neon-green/40 bg-neon-green/10 px-2 py-0.5 text-[10px] font-semibold text-neon-green">
            <Sparkles size={10} />
            現在のキーが最適
          </span>
        ) : (
          <span className="flex items-center gap-1 rounded-full border border-neon-amber/40 bg-neon-amber/10 px-2 py-0.5 text-[10px] font-semibold text-neon-amber">
            <ArrowRight size={10} />
            {formatKey(currentPreferredKey)} → {formatKey(bestKey)}
          </span>
        )}
      </div>
      <p className="text-sm text-white">
        <span className="text-white/50">候補:</span>{" "}
        <span className="font-mono text-neon-cyan">
          KEY {formatKeyDelta(bestKey)}
        </span>
        <span className="ml-2 text-xs text-white/60 tabular-nums">
          (avg {best.avg.toFixed(1)} / best {best.best.toFixed(3)} / {best.count}{" "}
          回)
        </span>
      </p>
      <StatsTable stats={stats} currentKey={currentPreferredKey} />
    </section>
  );
}

function StatsTable({
  stats,
  currentKey,
}: {
  stats: { key: number; count: number; best: number; avg: number }[];
  currentKey: number;
}) {
  if (stats.length <= 1) return null;
  return (
    <table className="mt-3 w-full text-left text-xs">
      <thead>
        <tr className="border-b border-white/10 text-white/40">
          <th className="py-1 font-normal">KEY</th>
          <th className="py-1 font-normal tabular-nums">avg</th>
          <th className="py-1 font-normal tabular-nums">best</th>
          <th className="py-1 font-normal tabular-nums">回数</th>
        </tr>
      </thead>
      <tbody>
        {stats.map((s) => (
          <tr key={s.key} className="border-b border-white/5">
            <td className="py-1 font-mono text-white">
              {formatKeyDelta(s.key)}
              {s.key === currentKey && (
                <span className="ml-1 text-[9px] text-white/40">(現在)</span>
              )}
            </td>
            <td className="py-1 tabular-nums text-white/80">
              {s.avg.toFixed(1)}
            </td>
            <td className="py-1 tabular-nums text-white/60">
              {s.best.toFixed(3)}
            </td>
            <td className="py-1 tabular-nums text-white/60">{s.count}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
