import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { ScoreRadarChart } from "@/components/features/repertoire/detail/ScoreRadarChart";
import { MonthlyTrendChart } from "@/components/features/stats/MonthlyTrendChart";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import {
  getMonthlySummary,
  getMonthlyTrend,
  getOverallAxisAverages,
  getTopSongsByBest,
} from "@/lib/queries/stats";

export const metadata = {
  title: "統計 | カラオケレパ",
};

export default async function StatsPage() {
  const [summary, trend, axes, topSongs] = await Promise.all([
    getMonthlySummary(),
    getMonthlyTrend(12),
    getOverallAxisAverages(),
    getTopSongsByBest(10),
  ]);

  return (
    <div className="mx-auto max-w-3xl pb-24 md:pb-6">
      <header className="flex items-center gap-2 pt-4 pb-2">
        <Link
          href="/"
          aria-label="ホームへ戻る"
          className="flex h-9 w-9 items-center justify-center rounded-md text-white/80 hover:bg-white/5 hover:text-white"
        >
          <ChevronLeft size={20} />
        </Link>
        <h1 className="flex-1 text-lg font-semibold text-white">統計</h1>
      </header>

      <section className="mx-4 rounded-xl border border-white/10 bg-bg-surface p-4">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">
          今月 / 先月
        </h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-white/50">今月 歌唱</dt>
          <dd className="tabular-nums text-white">
            {summary.current.count} 回
          </dd>
          <dt className="text-white/50">今月 平均</dt>
          <dd className="tabular-nums text-white">
            {summary.current.avg?.toFixed(2) ?? "—"}
          </dd>
          <dt className="text-white/50">今月 自己ベスト</dt>
          <dd className="tabular-nums text-white">
            {summary.current.best?.toFixed(2) ?? "—"}
          </dd>
          <dt className="text-white/50">先月 歌唱</dt>
          <dd className="tabular-nums text-white/70">
            {summary.previous?.count ?? 0} 回
          </dd>
          <dt className="text-white/50">先月 平均</dt>
          <dd className="tabular-nums text-white/70">
            {summary.previous?.avg?.toFixed(2) ?? "—"}
          </dd>
        </dl>
      </section>

      <section className="mx-4 mt-4 rounded-xl border border-white/10 bg-bg-surface p-3">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">
          月別推移 (過去 12 ヶ月)
        </h2>
        <MonthlyTrendChart points={trend} />
      </section>

      <section className="mx-4 mt-4 rounded-xl border border-white/10 bg-bg-surface p-3">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">
          5 項目 平均 (全履歴 {axes.sampleSize} 件)
        </h2>
        {axes.sampleSize === 0 ? (
          <p className="py-6 text-center text-xs text-white/50">
            歌唱データがありません。
          </p>
        ) : (
          <ScoreRadarChart
            pitch={axes.pitch}
            stability={axes.stability}
            expression={axes.expression}
            vibratoLongtone={axes.vibrato_longtone}
            rhythm={axes.rhythm}
          />
        )}
      </section>

      <section className="mx-4 mt-4 rounded-xl border border-white/10 bg-bg-surface p-3">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">
          ベスト 10
        </h2>
        {topSongs.length === 0 ? (
          <p className="py-6 text-center text-xs text-white/50">
            まだ歌唱データがありません。
          </p>
        ) : (
          <ol className="divide-y divide-white/5">
            {topSongs.map((s, i) => (
              <li
                key={s.song_id}
                className="flex items-center gap-3 py-2"
              >
                <span className="w-5 shrink-0 text-center text-xs text-white/40 tabular-nums">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-white">
                    {s.title}
                  </div>
                  <div className="truncate text-xs text-white/50">
                    {s.artist} · {s.count} 回
                  </div>
                </div>
                <ScoreBadge value={s.best} size="sm" />
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
