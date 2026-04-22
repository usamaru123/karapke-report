import { ChevronLeft, LineChart } from "lucide-react";
import Link from "next/link";
import { FindingCard } from "@/components/features/advice/FindingCard";
import { ScoreRadarChart } from "@/components/features/repertoire/detail/ScoreRadarChart";
import { MonthlyTrendChart } from "@/components/features/stats/MonthlyTrendChart";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { buildHistoryInput } from "@/lib/advice/build-history-input";
import { diagnoseHistoryOverall } from "@/lib/advice/diagnose-history";
import { sortFindings } from "@/lib/advice/diagnose-score";
import { getAggregateAdviceData } from "@/lib/queries/advice";
import { getMyAdviceVotes } from "@/lib/queries/advice-feedback";
import {
  getMonthlySummary,
  getMonthlyTrend,
  getOverallAxisAverages,
  getTopSongsByBest,
} from "@/lib/queries/stats";

export const metadata = {
  title: "統計 | カラオケレパ",
};

/**
 * Pure helper: derive a few narrative insights from the monthly / axis
 * tallies so the page doesn't read as a pile of numbers. Kept here as a
 * local function because the phrasing is page-specific; if it grows beyond
 * ~5 lines, lift into `lib/stats-insights.ts` and add Vitest coverage.
 */
function deriveInsights(
  summary: Awaited<ReturnType<typeof getMonthlySummary>>,
  axes: Awaited<ReturnType<typeof getOverallAxisAverages>>,
): string[] {
  const out: string[] = [];
  const { current, previous, delta } = summary;

  if (current.count === 0) {
    out.push("今月はまだ歌唱がありません。");
  } else if (delta && delta.count !== 0) {
    const dir = delta.count > 0 ? "増" : "減";
    out.push(
      `今月の歌唱は ${current.count} 回 (先月比 ${delta.count > 0 ? "+" : ""}${delta.count} ${dir})。`,
    );
  }
  if (delta?.avg !== null && delta?.avg !== undefined && Math.abs(delta.avg) >= 0.5) {
    const sign = delta.avg > 0 ? "+" : "";
    out.push(
      `平均点は ${current.avg!.toFixed(2)} (先月比 ${sign}${delta.avg.toFixed(2)})。${delta.avg > 0 ? "上昇傾向です。" : "やや下降気味。"}`,
    );
  }
  if (delta?.best !== null && delta?.best !== undefined && delta.best > 0) {
    out.push(`自己ベスト ${current.best!.toFixed(2)} を先月より ${delta.best.toFixed(2)} 点更新。`);
  }
  if (axes.sampleSize > 0) {
    const arr: Array<[string, number]> = [];
    if (axes.pitch !== null) arr.push(["音程", axes.pitch]);
    if (axes.stability !== null) arr.push(["安定性", axes.stability]);
    if (axes.expression !== null) arr.push(["表現力", axes.expression]);
    if (axes.vibrato_longtone !== null) arr.push(["V&L", axes.vibrato_longtone]);
    if (axes.rhythm !== null) arr.push(["リズム", axes.rhythm]);
    if (arr.length > 0) {
      arr.sort((a, b) => a[1] - b[1]);
      const weakest = arr[0];
      const strongest = arr[arr.length - 1];
      out.push(
        `全履歴平均では「${strongest[0]}」(${strongest[1].toFixed(1)}) が最高、「${weakest[0]}」(${weakest[1].toFixed(1)}) が最低。差 ${(strongest[1] - weakest[1]).toFixed(1)} 点。`,
      );
    }
  }
  if (previous && previous.count > 0 && current.count === 0) {
    out.push("今月はまだ歌っていません。先月は " + previous.count + " 回でした。");
  }
  return out;
}

export default async function StatsPage() {
  const [summary, trend, axes, topSongs, aggData, votes] = await Promise.all([
    getMonthlySummary(),
    getMonthlyTrend(12),
    getOverallAxisAverages(),
    getTopSongsByBest(10),
    getAggregateAdviceData(),
    getMyAdviceVotes(),
  ]);

  const insights = deriveInsights(summary, axes);

  // Cross-song aggregate advice (R21 / R23 / R24). R20 / R22 stay on the
  // repertoire detail page because they need a focusSongId.
  const aggregateFindings = sortFindings(
    diagnoseHistoryOverall(
      buildHistoryInput(aggData.scores, aggData.songsById),
    ),
  );

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

      {insights.length > 0 && (
        <section className="mx-4 rounded-xl border border-neon-cyan/20 bg-neon-cyan/5 p-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neon-cyan">
            今月のハイライト
          </h2>
          <ul className="space-y-1 text-sm text-white/85">
            {insights.map((line, i) => (
              <li key={i} className="flex gap-2">
                <span aria-hidden className="text-neon-cyan/60">
                  ・
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mx-4 mt-4 rounded-xl border border-white/10 bg-bg-surface p-4">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">
          今月 / 先月 (数字)
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

      {aggregateFindings.length > 0 && (
        <section className="mx-4 mt-4 rounded-xl border border-white/10 bg-bg-surface p-3">
          <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-white/50">
            <LineChart size={12} />
            全体アドバイス
          </h2>
          <div className="space-y-2">
            {aggregateFindings.slice(0, 5).map((f) => (
              <FindingCard
                key={f.ruleId}
                finding={f}
                vote={votes.get(f.ruleId) ?? null}
              />
            ))}
          </div>
          <p className="mt-2 border-t border-white/5 pt-2 text-[10px] text-white/30">
            DAM 精密採点 Ai の公式ロジック詳細は非公開。有志スコアラー実測と公開特許に基づく推定を含みます。
          </p>
        </section>
      )}

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
