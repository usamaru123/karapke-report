import { LineChart, Sparkles } from "lucide-react";
import { EstimatedNote } from "@/components/ui/EstimatedNote";
import type { Finding } from "@/lib/advice/types";
import { FindingCard } from "./FindingCard";

type Props = {
  /** Findings from single-score rules (diagnose-score). */
  findings: Finding[];
  /**
   * Findings from aggregate rules (diagnose-history). Optional — when absent
   * or empty, the aggregate subsection is omitted entirely.
   */
  aggregateFindings?: Finding[];
  /**
   * The caller's existing 👍/👎 votes keyed by ruleId. Optional — when absent
   * the thumbs buttons render in "no-vote" state but remain interactive.
   */
  votes?: Map<string, 1 | -1>;
  /** Upper bound on displayed single-score findings. Defaults to 5. */
  limit?: number;
  /** Upper bound on displayed aggregate findings. Defaults to 3. */
  aggregateLimit?: number;
  /**
   * Data window used for the single-score findings. When provided, we show
   * it as "直近 N 件 (YYYY/MM/DD - YYYY/MM/DD)" instead of the vague default
   * "直近 10 回の傾向". Pass null/undefined to hide the date range.
   */
  dataWindow?: {
    count: number;
    fromDate: string | null; // ISO
    toDate: string | null; // ISO
  };
};

function formatYmd(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Server Component. Renders the per-score AND aggregate advice list for a
 * repertoire detail page. Pre-sorted findings should be passed in — this
 * component only slices and displays.
 */
export function AdviceSection({
  findings,
  aggregateFindings = [],
  votes,
  limit = 5,
  aggregateLimit = 3,
  dataWindow,
}: Props) {
  const shown = findings.slice(0, limit);
  const hidden = findings.length - shown.length;
  const shownAgg = aggregateFindings.slice(0, aggregateLimit);
  const hiddenAgg = aggregateFindings.length - shownAgg.length;

  const voteOf = (ruleId: string): 1 | -1 | null =>
    votes?.get(ruleId) ?? null;

  // Build "直近 N 件 (YYYY/MM/DD - YYYY/MM/DD)" sublabel when caller provides
  // metadata. Previous hardcoded "(直近 10 回の傾向)" was misleading on the
  // scores detail page (single score) — we no longer default to it.
  const periodLabel = dataWindow
    ? dataWindow.fromDate && dataWindow.toDate
      ? `直近 ${dataWindow.count} 件 · ${formatYmd(dataWindow.fromDate)} – ${formatYmd(dataWindow.toDate)}`
      : `直近 ${dataWindow.count} 件`
    : null;

  return (
    <section className="mx-4 mt-4 rounded-xl border border-white/10 bg-bg-surface p-3">
      <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-white/50">
        <Sparkles size={12} />
        アドバイス
        {periodLabel && (
          <span className="font-normal normal-case tracking-normal text-white/40">
            ({periodLabel})
          </span>
        )}
      </h3>

      {shown.length === 0 ? (
        <p className="py-4 text-center text-xs text-white/50">
          今の診断で気になる点はありません。
        </p>
      ) : (
        <div className="space-y-2">
          {shown.map((f) => (
            <FindingCard key={f.ruleId} finding={f} vote={voteOf(f.ruleId)} />
          ))}
          {hidden > 0 && (
            <p className="pt-1 text-center text-[10px] text-white/40">
              （他 {hidden} 件の気付きは省略）
            </p>
          )}
        </div>
      )}

      {shownAgg.length > 0 && (
        <>
          <h3 className="mb-2 mt-5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-white/50">
            <LineChart size={12} />
            アドバイス (履歴全体)
          </h3>
          <div className="space-y-2">
            {shownAgg.map((f) => (
              <FindingCard key={f.ruleId} finding={f} vote={voteOf(f.ruleId)} />
            ))}
            {hiddenAgg > 0 && (
              <p className="pt-1 text-center text-[10px] text-white/40">
                （他 {hiddenAgg} 件の気付きは省略）
              </p>
            )}
          </div>
        </>
      )}

      <EstimatedNote variant="advice" className="mt-3" />
    </section>
  );
}
