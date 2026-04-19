import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Sparkles } from "lucide-react";
import type { HeroBest } from "@/lib/queries/dashboard";
import { formatScore } from "@/lib/format";

type Props = { hero: HeroBest };

export function HeroCard({ hero }: Props) {
  const { current, isBestUpdated } = hero;

  if (!current) {
    return (
      <section className="rounded-2xl border border-white/10 bg-bg-surface p-6 text-center">
        <p className="text-xs text-white/50">自己ベスト (今月)</p>
        <p className="mt-3 text-sm text-white/60">
          今月の歌唱データがまだありません。カラオケで歌ってから取り込んでください。
        </p>
      </section>
    );
  }

  const sungAt = new Date(current.sung_at);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-neon-pink/30 bg-bg-surface p-6 shadow-glow-pink-soft">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-white/50">
          自己ベスト (今月)
        </p>
        {isBestUpdated && (
          <span className="flex items-center gap-1 rounded-full border border-neon-amber/40 bg-neon-amber/10 px-2 py-0.5 text-[10px] font-semibold text-neon-amber">
            <Sparkles size={10} />
            自己ベスト更新
          </span>
        )}
      </div>

      <div className="mt-4 text-center">
        <p className="text-6xl font-bold text-neon-pink neon-text-pink tabular-nums">
          {formatScore(current.total_score)}
        </p>
        <p className="mt-3 text-lg font-semibold text-white">
          {current.song?.title ?? "—"}
        </p>
        <p className="mt-1 text-sm text-white/60">
          {current.song?.artist ?? "—"}
        </p>
      </div>

      <p className="mt-4 text-center text-xs text-white/50">
        {format(sungAt, "M月d日", { locale: ja })} 歌唱
      </p>
    </section>
  );
}
