import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function ScoreNotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 pt-12 text-center">
      <h2 className="text-lg font-semibold text-white">
        歌唱が見つかりません
      </h2>
      <p className="mt-2 text-sm text-white/60">
        歌唱ログが削除された、もしくは自分以外のユーザーの ID です。
      </p>
      <Link
        href="/history"
        className="mt-6 inline-flex items-center gap-1 text-sm text-neon-cyan hover:underline"
      >
        <ChevronLeft size={14} />
        履歴へ戻る
      </Link>
    </div>
  );
}
