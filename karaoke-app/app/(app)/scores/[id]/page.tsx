import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdviceSection } from "@/components/features/advice/AdviceSection";
import { ScoreRadarChart } from "@/components/features/repertoire/detail/ScoreRadarChart";
import { PitchIntervalBars } from "@/components/features/scores/PitchIntervalBars";
import { TechniqueCountGrid } from "@/components/features/scores/TechniqueCountGrid";
import { KeyBadge } from "@/components/ui/KeyBadge";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { buildScoreInput } from "@/lib/advice/build-score-input";
import { diagnoseScore, sortFindings } from "@/lib/advice/diagnose-score";
import { extractIntervalGraph } from "@/lib/advice/raw-xml-extract";
import { formatKey } from "@/lib/format";
import { getMyAdviceVotes } from "@/lib/queries/advice-feedback";
import { getScoreDetail } from "@/lib/queries/scores";
import { getUserVocalRange } from "@/lib/queries/user_range";

/**
 * Per-scoring detail page reached from /history's ScoreRow. Unlike the
 * repertoire detail page (which aggregates across same-song attempts), this
 * surface shows ONE concrete scoring in full — the single-score rules
 * therefore get the raw `latestScore` input, not the robust-mean version.
 */
export default async function ScoreDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let detail: Awaited<ReturnType<typeof getScoreDetail>>;
  try {
    detail = await getScoreDetail(id);
  } catch {
    notFound();
  }

  const { score, song, pitchIntervals } = detail;
  const [userRange, votes] = await Promise.all([
    getUserVocalRange(),
    getMyAdviceVotes(),
  ]);
  const findings = sortFindings(
    diagnoseScore(buildScoreInput(score, song, userRange)),
  );

  const sungAt = new Date(score.sung_at);
  const num = (v: number | string | null) =>
    v === null ? null : Number(v);

  const intervalGraph = extractIntervalGraph(score.raw_xml);

  return (
    <div className="mx-auto max-w-3xl pb-24 md:pb-6">
      <header className="flex items-center gap-2 pt-4 pb-2">
        <Link
          href="/history"
          aria-label="履歴へ戻る"
          className="flex h-9 w-9 items-center justify-center rounded-md text-white/80 hover:bg-white/5 hover:text-white"
        >
          <ChevronLeft size={22} />
        </Link>
        <h1 className="flex-1 truncate text-base font-semibold text-white">
          歌唱詳細
        </h1>
      </header>

      <section className="mx-4 rounded-xl border border-white/10 bg-bg-surface p-4">
        <p className="text-xs text-white/50 tabular-nums">
          {format(sungAt, "yyyy/M/d (E) HH:mm", { locale: ja })} ·{" "}
          <KeyBadge value={score.key_control} />
        </p>
        <Link
          href={`/repertoire?q=${encodeURIComponent(song.title)}`}
          className="mt-1 block truncate text-lg font-semibold text-white hover:underline"
        >
          {song.title}
        </Link>
        <p className="truncate text-sm text-white/60">{song.artist}</p>
        <div className="mt-3 flex items-end gap-3">
          <ScoreBadge value={score.total_score} size="lg" />
          {score.ai_bonus !== null && (
            <p className="pb-1 text-xs text-white/50 tabular-nums">
              素点 {(Number(score.total_score) - Number(score.ai_bonus)).toFixed(2)}
              {" + ボーナス "}
              {Number(score.ai_bonus).toFixed(2)}
            </p>
          )}
        </div>
      </section>

      <section className="mx-4 mt-4 rounded-xl border border-white/10 bg-bg-surface p-3">
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-white/50">
          5 項目レーダー
        </h3>
        <ScoreRadarChart
          pitch={num(score.pitch_score)}
          stability={num(score.stability_score)}
          expression={num(score.expression_score)}
          vibratoLongtone={num(score.vibrato_longtone_score)}
          rhythm={num(score.rhythm_score)}
        />
        {score.intonation !== null && (
          <p className="mt-1 text-center text-[11px] text-white/50">
            抑揚: <span className="tabular-nums text-white/80">{score.intonation}</span>
          </p>
        )}
      </section>

      <section className="mx-4 mt-4 rounded-xl border border-white/10 bg-bg-surface p-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">
          24 区間音程
        </h3>
        <PitchIntervalBars
          intervals={pitchIntervals}
          aiDeduct={intervalGraph.aiDeductPoints}
        />
      </section>

      <section className="mx-4 mt-4 rounded-xl border border-white/10 bg-bg-surface p-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">
          技法カウント
        </h3>
        <TechniqueCountGrid rawXml={score.raw_xml} />
      </section>

      <AdviceSection findings={findings} votes={votes} />

      <p className="mt-4 px-4 text-center text-[11px] text-white/40">
        キー: {formatKey(score.key_control)} · scoring_type: {score.scoring_type}
      </p>
    </div>
  );
}
