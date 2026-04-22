import { notFound } from "next/navigation";
import { DetailActions } from "@/components/features/repertoire/detail/DetailActions";
import { DetailHeader } from "@/components/features/repertoire/detail/DetailHeader";
import { MetaInfoPanel } from "@/components/features/repertoire/detail/MetaInfoPanel";
import { ScoreHistoryChart } from "@/components/features/repertoire/detail/ScoreHistoryChart";
import { ScoreRadarChart } from "@/components/features/repertoire/detail/ScoreRadarChart";
import { ScoreSummaryCard } from "@/components/features/repertoire/detail/ScoreSummaryCard";
import { SongInfoHero } from "@/components/features/repertoire/detail/SongInfoHero";
import { VocalRangeBar } from "@/components/features/repertoire/detail/VocalRangeBar";
import { getRepertoireDetail } from "@/lib/queries/repertoire";
import { getUserVocalRange } from "@/lib/queries/user_range";

export default async function RepertoireDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const editing = sp.edit === "1";

  let detail: Awaited<ReturnType<typeof getRepertoireDetail>>;
  try {
    detail = await getRepertoireDetail(id);
  } catch {
    notFound();
  }

  const userRange = await getUserVocalRange();
  const { repertoire, song, scores, stats } = detail;
  const latestScore = scores[0] ?? null;
  const recent10 = scores.slice(0, 10).map((s) => ({
    sung_at: s.sung_at,
    total_score: Number(s.total_score),
  }));

  return (
    <div className="mx-auto max-w-3xl pb-6">
      <DetailHeader editing={editing} />
      <SongInfoHero song={song} />
      <div className="my-3">
        <ScoreSummaryCard
          best={stats.best}
          latest={stats.latestScore}
          avg={stats.avg}
        />
      </div>

      <section className="mx-4 mt-4 rounded-xl border border-white/10 bg-bg-surface p-3">
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-white/50">
          直近の採点レーダー
        </h3>
        {latestScore ? (
          <ScoreRadarChart
            pitch={
              latestScore.pitch_score === null
                ? null
                : Number(latestScore.pitch_score)
            }
            stability={
              latestScore.stability_score === null
                ? null
                : Number(latestScore.stability_score)
            }
            expression={
              latestScore.expression_score === null
                ? null
                : Number(latestScore.expression_score)
            }
            vibratoLongtone={
              latestScore.vibrato_longtone_score === null
                ? null
                : Number(latestScore.vibrato_longtone_score)
            }
            rhythm={
              latestScore.rhythm_score === null
                ? null
                : Number(latestScore.rhythm_score)
            }
          />
        ) : (
          <p className="py-6 text-center text-sm text-white/50">
            歌唱履歴がありません。
          </p>
        )}
      </section>

      <div className="mt-4">
        <VocalRangeBar
          songLow={song.vocal_range_lowest}
          songHigh={song.vocal_range_highest}
          mineLow={userRange.low}
          mineHigh={userRange.high}
          sampleSize={userRange.sampleSize}
        />
      </div>

      <div className="mt-2">
        <MetaInfoPanel repertoire={repertoire} editing={editing} />
      </div>

      <section className="mt-4 px-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">
          歌唱推移 (直近 10 回)
        </h3>
        <ScoreHistoryChart points={recent10} />
      </section>

      <DetailActions repertoireId={repertoire.id} songId={song.id} />
    </div>
  );
}
