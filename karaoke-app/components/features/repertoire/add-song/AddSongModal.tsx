"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import type { AddableSong } from "@/lib/queries/repertoire";
import { AddFromHistoryTab } from "./AddFromHistoryTab";
import { ManualAddForm } from "./ManualAddForm";

type Props = {
  open: boolean;
  onClose: () => void;
  addableSongs: AddableSong[];
};

type Tab = "history" | "manual";

export function AddSongModal({ open, onClose, addableSongs }: Props) {
  const [tab, setTab] = useState<Tab>("history");

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

        <div
          role="tablist"
          aria-label="追加元"
          className="mx-5 mt-3 flex gap-1 rounded-md bg-bg-elevated p-1"
        >
          <TabButton
            active={tab === "history"}
            onClick={() => setTab("history")}
          >
            採点履歴から
          </TabButton>
          <TabButton
            active={tab === "manual"}
            onClick={() => setTab("manual")}
          >
            手動で追加
          </TabButton>
        </div>

        <div className="p-5">
          {tab === "history" ? (
            <AddFromHistoryTab songs={addableSongs} onDone={onClose} />
          ) : (
            <ManualAddForm onDone={onClose} />
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex-1 rounded px-3 py-1.5 text-xs transition-colors ${
        active
          ? "bg-neon-pink/20 text-neon-pink"
          : "text-white/60 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}
