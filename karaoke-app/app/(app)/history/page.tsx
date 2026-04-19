import { InfoBanner } from "@/components/features/history/InfoBanner";
import { PeriodTabs } from "@/components/features/history/PeriodTabs";
import { SessionGroup } from "@/components/features/history/SessionGroup";
import {
  getHistoryWithSessions,
  type PeriodFilter,
} from "@/lib/queries/history";

const PERIODS: readonly PeriodFilter[] = ["this_month", "this_year", "all"];

function parsePeriod(v: string | undefined): PeriodFilter {
  return (PERIODS as readonly string[]).includes(v ?? "")
    ? (v as PeriodFilter)
    : "this_month";
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const sp = await searchParams;
  const period = parsePeriod(sp.period);
  const sessions = await getHistoryWithSessions({ period });
  const totalCount = sessions.reduce((acc, s) => acc + s.scores.length, 0);

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

      <PeriodTabs active={period} />

      {sessions.length === 0 ? (
        <p className="px-6 py-16 text-center text-sm text-white/50">
          この期間に歌唱データはありません。
        </p>
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
