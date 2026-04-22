"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import { ManualAddForm } from "./ManualAddForm";

type Props = {
  open: boolean;
  onClose: () => void;
};

/**
 * Manual-add only. The "採点履歴から" tab was removed — the sync pipeline
 * now auto-inserts every sung song as `confidence='unset'`, so
 * rebuilding-from-history from the UI is redundant. This dialog is for
 * songs that aren't on DAM (yet) or that the user wants to register as
 * "歌いたい" before actually singing them.
 */
export function AddSongModal({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="曲を追加"
      className="fixed inset-0 z-30 flex items-end justify-center bg-black/60 md:items-center"
      onClick={onClose}
    >
      <div
        className="relative flex w-full max-w-md flex-col rounded-t-2xl border border-white/10 bg-bg-surface md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-center pt-2 md:hidden">
          <span aria-hidden className="h-1 w-10 rounded-full bg-white/20" />
        </div>

        <div className="flex items-center justify-between px-5 pt-3">
          <h2 className="text-lg font-semibold text-white">曲を追加</h2>
          <button
            type="button"
            aria-label="閉じる"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded text-white/60 hover:bg-white/5 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <p className="mx-5 mt-2 text-xs text-white/50">
          歌った曲は同期時に自動で「未設定」として追加されます。ここは
          まだ歌っていない / DAM API に無い曲を手動登録する用途です。
        </p>

        <div className="p-5">
          <ManualAddForm onDone={onClose} />
        </div>
      </div>
    </div>
  );
}
