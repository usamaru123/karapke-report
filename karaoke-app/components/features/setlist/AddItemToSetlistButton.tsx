"use client";

import { Plus, Search, X } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyBadge } from "@/components/ui/KeyBadge";
import { addItemToSetlist } from "@/lib/actions/setlists";
import type { RepertoireWithMeta } from "@/lib/queries/repertoire";

type Props = {
  setlistId: string;
  repertoire: RepertoireWithMeta[];
  alreadyInSetlist: Set<string>;
};

export function AddItemToSetlistButton({
  setlistId,
  repertoire,
  alreadyInSetlist,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [addingId, setAddingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return repertoire;
    return repertoire.filter(
      (r) =>
        r.song.title.toLowerCase().includes(q) ||
        r.song.artist.toLowerCase().includes(q),
    );
  }, [query, repertoire]);

  function handleAdd(songId: string) {
    setAddingId(songId);
    startTransition(async () => {
      try {
        await addItemToSetlist(setlistId, songId);
        router.refresh();
        setAddingId(null);
      } catch {
        setAddingId(null);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/15 bg-white/[0.03] py-3 text-sm text-white/70 hover:border-white/30 hover:text-white"
      >
        <Plus size={14} />
        曲を追加
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
            className="flex w-full max-w-md flex-col rounded-t-2xl border border-white/10 bg-bg-surface md:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-center pt-2 md:hidden">
              <span
                aria-hidden
                className="h-1 w-10 rounded-full bg-white/20"
              />
            </div>

            <div className="flex items-center justify-between px-5 pt-3">
              <h2 className="text-lg font-semibold text-white">
                曲をセトリに追加
              </h2>
              <button
                type="button"
                aria-label="閉じる"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded text-white/60 hover:bg-white/5 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 pt-3">
              <label className="mb-3 flex items-center gap-2 rounded-md border border-white/10 bg-bg-elevated px-2">
                <Search size={14} className="text-white/50" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="レパートリーを検索"
                  className="flex-1 bg-transparent py-2 text-sm text-white outline-none placeholder:text-white/30"
                />
              </label>

              <div className="max-h-[55vh] overflow-y-auto rounded-md border border-white/10 bg-bg-elevated/40">
                {filtered.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-white/50">
                    {repertoire.length === 0
                      ? "レパートリーが空です。先にレパに曲を追加してください。"
                      : "該当する曲がありません"}
                  </p>
                ) : (
                  <ul className="divide-y divide-white/5">
                    {filtered.map((r) => {
                      const already = alreadyInSetlist.has(r.song.id);
                      const adding = addingId === r.song.id;
                      return (
                        <li
                          key={r.id}
                          className="flex items-center gap-3 px-3 py-2"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm text-white">
                              {r.song.title}
                            </div>
                            <div className="mt-0.5 flex items-center gap-2 text-xs text-white/50">
                              <span className="truncate">
                                {r.song.artist}
                              </span>
                              <KeyBadge value={r.preferred_key} />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAdd(r.song.id)}
                            disabled={already || adding}
                            className={`flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${
                              already
                                ? "bg-white/5 text-white/40"
                                : "border border-neon-pink/40 bg-neon-pink/10 text-neon-pink disabled:opacity-50"
                            }`}
                          >
                            {already ? (
                              "追加済"
                            ) : (
                              <>
                                <Plus size={12} />
                                {adding ? "追加中" : "追加"}
                              </>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-1.5 text-xs text-white/70 hover:bg-white/5"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
