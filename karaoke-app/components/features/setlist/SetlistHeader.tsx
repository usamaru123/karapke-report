"use client";

import {
  BookTemplate,
  Check,
  ChevronLeft,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  deleteSetlist,
  toggleSetlistTemplate,
  updateSetlistMeta,
} from "@/lib/actions/setlists";

type Props = {
  setlistId: string;
  name: string;
  scheduledFor: string | null;
  isTemplate: boolean;
};

export function SetlistHeader({
  setlistId,
  name,
  scheduledFor,
  isTemplate,
}: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const [draftDate, setDraftDate] = useState(scheduledFor ?? "");
  const [editError, setEditError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteSetlist(setlistId);
      router.push("/setlists");
      router.refresh();
    });
  }

  function startEdit() {
    setDraftName(name);
    setDraftDate(scheduledFor ?? "");
    setEditError(null);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setEditError(null);
  }

  function saveEdit() {
    setEditError(null);
    startTransition(async () => {
      try {
        await updateSetlistMeta(setlistId, {
          name: draftName,
          // Treat empty string as "clear the scheduled date".
          scheduledFor: draftDate === "" ? null : draftDate,
        });
        setEditing(false);
        router.refresh();
      } catch (e) {
        setEditError(
          e instanceof Error ? e.message : "保存に失敗しました",
        );
      }
    });
  }

  function handleToggleTemplate() {
    startTransition(async () => {
      await toggleSetlistTemplate(setlistId, !isTemplate);
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
        {!editing && (
          <>
            <button
              type="button"
              aria-label={isTemplate ? "テンプレート解除" : "テンプレート化"}
              aria-pressed={isTemplate}
              onClick={handleToggleTemplate}
              disabled={isPending}
              className={`flex h-9 w-9 items-center justify-center rounded-md ${
                isTemplate
                  ? "bg-neon-amber/15 text-neon-amber"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              }`}
            >
              <BookTemplate size={16} />
            </button>
            <button
              type="button"
              aria-label="セットリストを編集"
              onClick={startEdit}
              className="flex h-9 w-9 items-center justify-center rounded-md text-white/70 hover:bg-white/5 hover:text-white"
            >
              <Pencil size={16} />
            </button>
          </>
        )}
        <button
          type="button"
          aria-label="セットリストを削除"
          onClick={() => setConfirming(true)}
          className="flex h-9 w-9 items-center justify-center rounded-md text-red-300/80 hover:bg-red-500/10 hover:text-red-300"
        >
          <Trash2 size={16} />
        </button>
      </header>

      {isTemplate && !editing && (
        <p className="pl-10 text-[11px] text-neon-amber/80">
          テンプレート中 · 新規セトリ作成時にコピー元として選べます
        </p>
      )}

      {!editing && scheduledFor && (
        <p className="pl-10 text-xs text-white/50 tabular-nums">
          開催予定日: {scheduledFor}
        </p>
      )}

      {editing && (
        <div className="mt-1 rounded-lg border border-white/10 bg-bg-surface p-3">
          <label className="block">
            <span className="mb-1 block text-xs text-white/60">名前</span>
            <input
              type="text"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              maxLength={80}
              autoFocus
              className="w-full rounded-md border border-white/10 bg-bg-elevated px-3 py-2 text-sm text-white outline-none focus:border-neon-cyan"
            />
          </label>
          <label className="mt-3 block">
            <span className="mb-1 block text-xs text-white/60">
              開催予定日 (任意)
            </span>
            <input
              type="date"
              value={draftDate}
              onChange={(e) => setDraftDate(e.target.value)}
              className="w-full rounded-md border border-white/10 bg-bg-elevated px-3 py-2 text-sm text-white outline-none focus:border-neon-cyan"
            />
          </label>

          {editError && (
            <p className="mt-2 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {editError}
            </p>
          )}

          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={cancelEdit}
              disabled={isPending}
              className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-white/70 hover:bg-white/5 disabled:opacity-50"
            >
              <X size={14} />
              キャンセル
            </button>
            <button
              type="button"
              onClick={saveEdit}
              disabled={isPending || draftName.trim().length === 0}
              className="flex items-center gap-1 rounded-md border border-neon-cyan/40 bg-neon-cyan/10 px-3 py-1.5 text-sm font-semibold text-neon-cyan shadow-glow-cyan disabled:opacity-40"
            >
              <Check size={14} />
              {isPending ? "保存中..." : "保存"}
            </button>
          </div>
        </div>
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
