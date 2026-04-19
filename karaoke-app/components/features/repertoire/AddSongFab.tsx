"use client";

import { Plus, X } from "lucide-react";
import { useEffect, useState } from "react";

// Skeleton FAB + placeholder sheet. The real add-song flow lands in P4-05.
export function AddSongFab() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="曲を追加"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-neon-pink to-neon-purple text-white shadow-glow-pink transition-transform hover:scale-105 active:scale-95 md:bottom-8"
      >
        <Plus size={26} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="曲を追加"
          className="fixed inset-0 z-30 flex items-end justify-center bg-black/60 md:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-t-2xl border border-white/10 bg-bg-surface p-6 md:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">曲を追加</h2>
              <button
                type="button"
                aria-label="閉じる"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded text-white/60 hover:bg-white/5 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-sm text-white/70">
              採点履歴から or 手動で曲を追加できるモーダルは{" "}
              <span className="text-neon-cyan">P4-05</span> で実装予定です。
            </p>
          </div>
        </div>
      )}
    </>
  );
}
