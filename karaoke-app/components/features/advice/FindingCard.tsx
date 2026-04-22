import { AlertTriangle, Info, Lightbulb } from "lucide-react";
import type { Finding, Severity } from "@/lib/advice/types";
import { FeedbackButtons } from "./FeedbackButtons";
import { SourceBadge } from "./SourceBadge";

type Props = {
  finding: Finding;
  /** User's existing thumbs vote for this rule, if any. */
  vote?: 1 | -1 | null;
};

const SEVERITY_VISUAL: Record<
  Severity,
  {
    icon: typeof Info;
    color: string;
    borderColor: string;
    bgColor: string;
  }
> = {
  warn: {
    icon: AlertTriangle,
    color: "text-red-300",
    borderColor: "border-red-500/40",
    bgColor: "bg-red-500/5",
  },
  tip: {
    icon: Lightbulb,
    color: "text-neon-amber",
    borderColor: "border-neon-amber/30",
    bgColor: "bg-neon-amber/5",
  },
  info: {
    icon: Info,
    color: "text-neon-cyan",
    borderColor: "border-white/10",
    bgColor: "bg-bg-surface",
  },
};

function formatMetricValue(v: number): string {
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(2).replace(/\.?0+$/, "");
}

export function FindingCard({ finding, vote = null }: Props) {
  const visual = SEVERITY_VISUAL[finding.severity];
  const Icon = visual.icon;
  const metricEntries = Object.entries(finding.metrics);

  return (
    <article
      className={`rounded-lg border ${visual.borderColor} ${visual.bgColor} p-3`}
    >
      <div className="flex items-start gap-2">
        <Icon size={16} className={`mt-0.5 shrink-0 ${visual.color}`} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className={`text-sm font-semibold ${visual.color}`}>
              {finding.title}
            </h4>
            <SourceBadge
              source={finding.source}
              confidence={finding.confidence}
            />
            <span className="ml-auto">
              <FeedbackButtons
                ruleId={finding.ruleId}
                initialVote={vote}
              />
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-white/80">
            {finding.message}
          </p>
          {metricEntries.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer select-none text-[10px] text-white/40 hover:text-white/60">
                詳細
              </summary>
              <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] tabular-nums">
                {metricEntries.map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <dt className="text-white/40">{k}</dt>
                    <dd className="text-white/70">{formatMetricValue(v)}</dd>
                  </div>
                ))}
              </dl>
            </details>
          )}
        </div>
      </div>
    </article>
  );
}
