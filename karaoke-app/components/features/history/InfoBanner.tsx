import { Info } from "lucide-react";

export function InfoBanner() {
  return (
    <aside className="mx-4 mt-6 flex gap-3 rounded-lg border border-white/10 bg-bg-surface/60 px-4 py-3 text-xs text-white/60">
      <Info size={14} className="shrink-0 text-neon-cyan/70" />
      <p>
        DAM の仕様により、API から取れるのは過去 200 件までです。
        それ以上は取り込み時点で自動保存済みなので、DB には残り続けます。
      </p>
    </aside>
  );
}
