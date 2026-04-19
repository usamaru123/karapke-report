"use client";

import { ChevronRight, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { removeFromRepertoire } from "@/lib/actions/repertoire";

type Props = {
  repertoireId: string;
  songId: string;
};

export function DetailActions({ repertoireId, songId }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      try {
        await removeFromRepertoire(repertoireId);
        router.push("/repertoire");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "削除に失敗しました");
        setConfirming(false);
      }
    });
  }

  return (
    <section className="px-4 pt-4 pb-24 md:pb-6">
      <Link
        href={`/history?song=${songId}`}
        className="flex items-center justify-between rounded-lg border border-white/10 bg-bg-surface px-4 py-3 text-sm text-white hover:bg-white/5"
      >
        <span>この曲の履歴をすべて見る</span>
        <ChevronRight size={16} className="text-white/50" />
      </Link>

      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/30 px-4 py-3 text-sm text-red-300 hover:bg-red-500/10"
      >
        <Trash2 size={16} />
        <span>レパートリーから削除</span>
      </button>

      {error && (
        <p className="mt-3 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}

      {confirming && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4"
          onClick={() => !isPending && setConfirming(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-white/10 bg-bg-surface p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-white">削除しますか？</h2>
            <p className="mt-2 text-sm text-white/70">
              レパートリーから削除すると元に戻せません。歌唱履歴や曲マスタは残ります。
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={isPending}
                className="rounded-md px-3 py-1.5 text-sm text-white/70 hover:bg-white/5 disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="rounded-md bg-red-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50"
              >
                {isPending ? "削除中..." : "削除する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
