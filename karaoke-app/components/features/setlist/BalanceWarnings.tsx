"use client";

import { AlertTriangle, Info } from "lucide-react";
import type { BalanceWarning } from "@/lib/setlist-balance";

type Props = { warnings: BalanceWarning[] };

/**
 * Inline card under the setlist editor. Hidden entirely when there's nothing
 * to flag so we don't add vertical noise to a perfectly-balanced plan.
 */
export function BalanceWarnings({ warnings }: Props) {
  if (warnings.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      {warnings.map((w) => {
        const Icon = w.level === "warn" ? AlertTriangle : Info;
        const tone =
          w.level === "warn"
            ? "border-neon-amber/40 bg-neon-amber/[0.08] text-neon-amber"
            : "border-white/10 bg-white/[0.03] text-white/70";
        return (
          <div
            key={w.id}
            className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-[12px] ${tone}`}
          >
            <Icon size={14} className="mt-0.5 shrink-0" aria-hidden />
            <div className="min-w-0">
              <p className="font-semibold">{w.title}</p>
              <p className="mt-0.5 text-[11px] text-white/55">{w.detail}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
