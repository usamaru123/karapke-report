import { ScoreBadge } from "@/components/ui/ScoreBadge";

type Props = {
  best: number | null;
  latest: number | null;
  avg: number | null;
};

function Cell({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: number | null;
  emphasize?: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1 py-3">
      <span className="text-xs text-white/50">{label}</span>
      {emphasize ? (
        <ScoreBadge value={value} size="md" />
      ) : (
        <span className="text-xl font-semibold tabular-nums text-white">
          {value !== null && Number.isFinite(value) ? value.toFixed(3) : "—"}
        </span>
      )}
    </div>
  );
}

export function ScoreSummaryCard({ best, latest, avg }: Props) {
  return (
    <section className="mx-4 rounded-xl border border-white/10 bg-bg-surface">
      <div className="flex divide-x divide-white/10">
        <Cell label="最高点" value={best} emphasize />
        <Cell label="直近点" value={latest} />
        <Cell label="平均点" value={avg} />
      </div>
    </section>
  );
}
