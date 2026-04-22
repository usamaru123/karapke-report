import { ChevronLeft, LineChart } from "lucide-react";
import Link from "next/link";
import { FindingCard } from "@/components/features/advice/FindingCard";
import { ScoreRadarChart } from "@/components/features/repertoire/detail/ScoreRadarChart";
import { MonthPicker } from "@/components/features/stats/MonthPicker";
import { MonthlyTrendChart } from "@/components/features/stats/MonthlyTrendChart";
import { SongOrderChart } from "@/components/features/stats/SongOrderChart";
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
  getSongOrderPerformance,
  getTopSongsByBest,
  parseMonthKey,
  toMonthKey,
} from "@/lib/queries/stats";

export const metadata = {
  title: "統計 | カラオケレパ",
};

/**
 * Pure helper: derive a few narrative insights from the monthly / axis
 * tallies so the page doesn't read as a pile of numbers.
 *
 * `isHistorical` flips the copy so we don't call a past month "今月".
 */
function deriveInsights(
  summary: Awaited<ReturnType<typeof getMonthlySummary>>,
  axes: Awaited<ReturnType<typeof getOverallAxisAverages>>,
  isHistorical: boolean,
  monthLabel: string,
): string[] {
  const out: string[] = [];
  const { current, previous, delta } = summary;
  const curWord = isHistorical ? `${monthLabel} は` : "今月の";

  if (current.count === 0) {
    out.push(`${isHistorical ? monthLabel + " は" : "今月は"}歌唱がありません。`);
  } else if (delta && delta.count !== 0) {
    const dir = delta.count > 0 ? "増" : "減";
    out.push(
      `${curWord}歌唱は ${current.count} 回 (前月比 ${delta.count > 0 ? "+" : ""}${delta.count} ${dir})。`,
    );
  }
  if (delta?.avg !== null && delta?.avg !== undefined && Math.abs(delta.avg) >= 0.5) {
    const sign = delta.avg > 0 ? "+" : "";
    out.push(
      `平均点は ${current.avg!.toFixed(2)} (前月比 ${sign}${delta.avg.toFixed(2)})。${delta.avg > 0 ? "上昇傾向です。" : "やや下降気味。"}`,
    );
  }
  if (delta?.best !== null && delta?.best !== undefined && delta.best > 0) {
    out.push(
      `自己ベスト ${current.best!.toFixed(2)} を前月より ${delta.best.toFixed(2)} 点更新。`,
    );
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
      const scope = isHistorical ? monthLabel : "全履歴";
      out.push(
        `${scope}平均では「${strongest[0]}」(${strongest[1].toFixed(1)}) が最高、「${weakest[0]}」(${weakest[1].toFixed(1)}) が最低。差 ${(strongest[1] - weakest[1]).toFixed(1)} 点。`,
      );
    }
  }
  if (!isHistorical && previous && previous.count > 0 && current.count === 0) {
    out.push("今月はまだ歌っていません。先月は " + previous.count + " 回でした。");
  }
  return out;
}

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const sp = await searchParams;

  const now = new Date();
  const latestKey = toMonthKey(now);

  // Parse the optional ?month=YYYY-MM into a Date at first-of-month.
  const parsed = parseMonthKey(sp.month);
  const targetDate = parsed ? parsed.start : new Date(now.getFullYear(), now.getMonth(), 1);
  const nextDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 1);
  const selectedKey = toMonthKey(targetDate);
  const isHistorical = selectedKey !== latestKey;
  const monthLabel = `${targetDate.getFullYear()}年${targetDate.getMonth() + 1}月`;

  const windowOpts = {
    from: targetDate.toISOString(),
    to: nextDate.toISOString(),
  };

  const [summary, trend, axes, topSongs, aggData, votes, songOrder] =
    await Promise.all([
      getMonthlySummary(targetDate),
      getMonthlyTrend(12),
      getOverallAxisAverages(isHistorical ? windowOpts : undefined),
      getTopSongsByBest(10, isHistorical ? windowOpts : undefined),
      getAggregateAdviceData(),
      getMyAdviceVotes(),
      getSongOrderPerformance(isHistorical ? windowOpts : undefined),
    ]);

  const insights = deriveInsights(summary, axes, isHistorical, monthLabel);

  // Build availableMonths for the picker from the trend data so only months
  // that exist (plus the selected one) are offered. Descending for dropdown UX.
  const availableMonths = [
    ...new Set([...trend.map((p) => p.month), selectedKey, latestKey]),
  ]
    .filter((m) => m <= latestKey)
    .sort((a, b) => b.localeCompare(a));

  // Aggregate advice (R21 / R23 / R24) is a cross-session pattern and
  // doesn't meaningfully restrict to a single month, so we only show it
  // on the "latest" view (the default).
  const aggregateFindings = isHistorical
    ? []
    : sortFindings(
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
        <h1 className="flex-1 text-lg font-semibold text-white">
          統計{isHistorical && ` · ${monthLabel}`}
        </h1>
        {isHistorical && (
          <Link
            href="/stats"
            className="rounded-md border border-white/10 px-2 py-1 text-xs text-white/70 hover:border-white/25 hover:text-white"
          >
            最新へ
          </Link>
        )}
      </header>

      <MonthPicker
        selected={selectedKey}
        availableMonths={availableMonths}
        latest={latestKey}
      />

      {insights.length > 0 && (
        <section className="mx-4 rounded-xl border border-neon-cyan/20 bg-neon-cyan/5 p-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neon-cyan">
            {isHistorical ? `${monthLabel} のハイライト` : "今月のハイライト"}
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
          {isHistorical
            ? `${monthLabel} / 前月 (数字)`
            : "今月 / 先月 (数字)"}
        </h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-white/50">
            {isHistorical ? "選択月" : "今月"} 歌唱
          </dt>
          <dd className="tabular-nums text-white">
            {summary.current.count} 回
          </dd>
          <dt className="text-white/50">
            {isHistorical ? "選択月" : "今月"} 平均
          </dt>
          <dd className="tabular-nums text-white">
            {summary.current.avg?.toFixed(2) ?? "—"}
          </dd>
          <dt className="text-white/50">
            {isHistorical ? "選択月" : "今月"} 自己ベスト
          </dt>
          <dd className="tabular-nums text-white">
            {summary.current.best?.toFixed(2) ?? "—"}
          </dd>
          <dt className="text-white/50">前月 歌唱</dt>
          <dd className="tabular-nums text-white/70">
            {summary.previous?.count ?? 0} 回
          </dd>
          <dt className="text-white/50">前月 平均</dt>
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
          曲順別 平均点 (喉の温まり曲線)
          {isHistorical && (
            <span className="ml-2 text-white/40">· {monthLabel}</span>
          )}
        </h2>
        <SongOrderChart data={songOrder} />
      </section>

      <section className="mx-4 mt-4 rounded-xl border border-white/10 bg-bg-surface p-3">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">
          5 項目 平均 (
          {isHistorical ? `${monthLabel} ` : "全履歴 "}
          {axes.sampleSize} 件)
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
          {isHistorical ? `${monthLabel} ベスト 10` : "ベスト 10"}
        </h2>
        {topSongs.length === 0 ? (
          <p className="py-6 text-center text-xs text-white/50">
            歌唱データがありません。
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
