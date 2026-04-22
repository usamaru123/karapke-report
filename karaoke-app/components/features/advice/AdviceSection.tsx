import { LineChart, Sparkles } from "lucide-react";
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
  /** Upper bound on displayed single-score findings. Defaults to 5. */
  limit?: number;
  /** Upper bound on displayed aggregate findings. Defaults to 3. */
  aggregateLimit?: number;
};

/**
 * Server Component. Renders the per-score AND aggregate advice list for a
 * repertoire detail page. Pre-sorted findings should be passed in — this
 * component only slices and displays.
 */
export function AdviceSection({
  findings,
  aggregateFindings = [],
  limit = 5,
  aggregateLimit = 3,
}: Props) {
  const shown = findings.slice(0, limit);
  const hidden = findings.length - shown.length;
  const shownAgg = aggregateFindings.slice(0, aggregateLimit);
  const hiddenAgg = aggregateFindings.length - shownAgg.length;

  return (
    <section className="mx-4 mt-4 rounded-xl border border-white/10 bg-bg-surface p-3">
      <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-white/50">
        <Sparkles size={12} />
        アドバイス (直近 10 回の傾向)
      </h3>

      {shown.length === 0 ? (
        <p className="py-4 text-center text-xs text-white/50">
          今の診断で気になる点はありません。
        </p>
      ) : (
        <div className="space-y-2">
          {shown.map((f) => (
            <FindingCard key={f.ruleId} finding={f} />
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
              <FindingCard key={f.ruleId} finding={f} />
            ))}
            {hiddenAgg > 0 && (
              <p className="pt-1 text-center text-[10px] text-white/40">
                （他 {hiddenAgg} 件の気付きは省略）
              </p>
            )}
          </div>
        </>
      )}

      <p className="mt-3 border-t border-white/5 pt-2 text-[10px] text-white/30">
        DAM 精密採点 Ai の公式ロジック詳細は非公開。上記は有志スコアラー実測と第一興商公開特許に基づく推定を含みます。
      </p>
    </section>
  );
}
