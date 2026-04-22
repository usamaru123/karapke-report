import Link from "next/link";
import { ArrowRight, Info } from "lucide-react";

// Shown on the dashboard only while the user has not yet registered their
// DAM★とも cdmCardNo. Without the card no, the scheduled sync cannot pull
// any scores, so the rest of the dashboard would appear permanently empty
// — the banner makes the required step obvious.
export function OnboardingBanner() {
  return (
    <section
      className="flex items-start gap-3 rounded-xl border border-neon-amber/40 bg-neon-amber/10 p-4 text-sm text-neon-amber"
      aria-live="polite"
    >
      <Info size={18} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-white">
          はじめに: DAM カード番号を登録してください
        </p>
        <p className="mt-1 text-xs text-white/70">
          DAM★とも の cdmCardNo を登録すると、自動同期で採点履歴が取り込まれます。
        </p>
        <Link
          href="/settings"
          className="mt-3 inline-flex items-center gap-1 rounded-md border border-neon-amber/50 bg-neon-amber/10 px-3 py-1.5 text-xs font-semibold text-neon-amber hover:bg-neon-amber/20"
        >
          設定画面を開く
          <ArrowRight size={12} />
        </Link>
      </div>
    </section>
  );
}
