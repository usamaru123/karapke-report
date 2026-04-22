import { Clock } from "lucide-react";
import { HistoryToolbar } from "@/components/features/history/HistoryToolbar";
import { InfoBanner } from "@/components/features/history/InfoBanner";
import { SessionGroup } from "@/components/features/history/SessionGroup";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  getHistoryWithSessions,
  parseHistoryMachine,
  parseHistoryRange,
  parseHistorySort,
  parseIsoDate,
  parseScoreBound,
} from "@/lib/queries/history";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    range?: string;
    sort?: string;
    date_from?: string;
    date_to?: string;
    score_min?: string;
    score_max?: string;
    machine?: string;
  }>;
}) {
  const sp = await searchParams;
  const range = parseHistoryRange(sp.range);
  const sort = parseHistorySort(sp.sort);
  const q = (sp.q ?? "").trim();
  const dateFrom = parseIsoDate(sp.date_from);
  const dateTo = parseIsoDate(sp.date_to);
  const scoreMin = parseScoreBound(sp.score_min);
  const scoreMax = parseScoreBound(sp.score_max);
  const machine = parseHistoryMachine(sp.machine);

  const sessions = await getHistoryWithSessions({
    range,
    sort,
    search: q || undefined,
    dateFrom,
    dateTo,
    scoreMin,
    scoreMax,
    machine,
  });
  const totalCount = sessions.reduce((acc, s) => acc + s.scores.length, 0);
  const hasAnyFilter =
    q ||
    range !== "all" ||
    dateFrom ||
    dateTo ||
    scoreMin !== null ||
    scoreMax !== null ||
    machine !== "any";

  return (
    <div className="mx-auto max-w-3xl pb-24 md:pb-6">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-bg-base/90 px-4 py-3 backdrop-blur">
        <h1 className="text-xl font-semibold text-white">
          採点履歴{" "}
          <span className="ml-1 text-sm text-white/50 tabular-nums">
            ({totalCount})
          </span>
        </h1>
      </header>

      <HistoryToolbar
        range={range}
        sort={sort}
        initialQuery={q}
        dateFrom={dateFrom ?? ""}
        dateTo={dateTo ?? ""}
        scoreMin={scoreMin !== null ? String(scoreMin) : ""}
        scoreMax={scoreMax !== null ? String(scoreMax) : ""}
        machine={machine}
      />

      {sessions.length === 0 ? (
        <div className="px-4 py-8">
          <EmptyState
            icon={Clock}
            title={
              hasAnyFilter
                ? "条件に合う歌唱データがありません"
                : "まだ歌唱データがありません"
            }
            description={
              hasAnyFilter
                ? "検索語・期間・点数範囲・機種を変えて試してください。"
                : "DAM カードを登録して同期すると、自動で履歴が表示されます。"
            }
            primary={
              hasAnyFilter
                ? { label: "条件をクリア", href: "/history" }
                : { label: "同期設定を開く", href: "/settings" }
            }
            variant="plain"
          />
        </div>
      ) : (
        <div>
          {sessions.map((session) => (
            <SessionGroup key={session.id} session={session} />
          ))}
        </div>
      )}

      <InfoBanner />
    </div>
  );
}
