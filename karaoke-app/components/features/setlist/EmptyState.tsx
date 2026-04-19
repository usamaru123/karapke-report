import { ListMusic } from "lucide-react";
import Link from "next/link";

export function SetlistEmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-white/10 bg-bg-surface px-6 py-16 text-center">
      <ListMusic className="text-white/30" size={40} />
      <p className="max-w-sm text-sm text-white/70">
        まだセットリストがありません。
        <br />
        次回のカラオケで歌う曲をまとめておくと便利です。
      </p>
      <Link
        href="/setlists/new"
        className="rounded-md bg-neon-pink px-4 py-2 text-sm font-semibold text-black shadow-glow-pink"
      >
        + 新しいセトリを作る
      </Link>
    </div>
  );
}
