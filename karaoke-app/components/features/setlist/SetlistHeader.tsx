"use client";

import { ChevronLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteSetlist } from "@/lib/actions/setlists";

type Props = {
  setlistId: string;
  name: string;
  scheduledFor: string | null;
};

export function SetlistHeader({ setlistId, name, scheduledFor }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteSetlist(setlistId);
      router.push("/setlists");
      router.refresh();
    });
  }

  return (
    <>
      <header className="flex items-center justify-between gap-2 pt-4 pb-2">
        <Link
          href="/setlists"
          aria-label="セットリスト一覧へ戻る"
          className="flex h-9 w-9 items-center justify-center rounded-md text-white/80 hover:bg-white/5 hover:text-white"
        >
          <ChevronLeft size={22} />
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-base font-semibold text-white">
          {name}
        </h1>
        <button
          type="button"
          aria-label="セットリストを削除"
          onClick={() => setConfirming(true)}
          className="flex h-9 w-9 items-center justify-center rounded-md text-red-300/80 hover:bg-red-500/10 hover:text-red-300"
        >
          <Trash2 size={16} />
        </button>
      </header>

      {scheduledFor && (
        <p className="pl-10 text-xs text-white/50 tabular-nums">
          開催予定日: {scheduledFor}
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
            <h2 className="text-lg font-semibold text-white">
              セトリを削除しますか？
            </h2>
            <p className="mt-2 text-sm text-white/70">
              中の曲も含めて削除されます。レパートリーや採点履歴は残ります。
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
    </>
  );
}
