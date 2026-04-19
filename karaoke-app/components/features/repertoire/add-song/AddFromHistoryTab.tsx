"use client";

import { Check, Plus, Search } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { addToRepertoire } from "@/lib/actions/repertoire";
import type { AddableSong } from "@/lib/queries/repertoire";

type Props = { songs: AddableSong[]; onDone: () => void };

type RowState =
  | { kind: "idle" }
  | { kind: "adding" }
  | { kind: "added" }
  | { kind: "error"; message: string };

export function AddFromHistoryTab({ songs, onDone }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({});
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return songs;
    return songs.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q),
    );
  }, [query, songs]);

  function handleAdd(songId: string) {
    setRowStates((m) => ({ ...m, [songId]: { kind: "adding" } }));
    startTransition(async () => {
      try {
        await addToRepertoire({ songId });
        setRowStates((m) => ({ ...m, [songId]: { kind: "added" } }));
        router.refresh();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "追加に失敗しました";
        setRowStates((m) => ({ ...m, [songId]: { kind: "error", message: msg } }));
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-2 rounded-md border border-white/10 bg-bg-elevated px-2">
        <Search size={14} className="text-white/50" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="採点履歴を検索"
          className="flex-1 bg-transparent py-2 text-sm text-white outline-none placeholder:text-white/30"
        />
      </label>

      <div className="max-h-[55vh] overflow-y-auto rounded-md border border-white/10 bg-bg-surface">
        {filtered.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-white/50">
            {songs.length === 0
              ? "採点履歴がありません。カラオケで歌ってから取り込んでください。"
              : "該当する曲がありません"}
          </p>
        ) : (
          <ul className="divide-y divide-white/5">
            {filtered.map((s) => {
              const rs = rowStates[s.id] ?? { kind: "idle" };
              const effectivelyAdded =
                s.inRepertoire || rs.kind === "added";
              return (
                <li
                  key={s.id}
                  className="flex items-center gap-3 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-white">
                      {s.title}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-white/50">
                      <span className="truncate">{s.artist}</span>
                      <span className="shrink-0 text-white/40 tabular-nums">
                        × {s.scoreCount}
                      </span>
                    </div>
                    {rs.kind === "error" && (
                      <div className="mt-1 text-[10px] text-red-300">
                        {rs.message}
                      </div>
                    )}
                  </div>
                  <ScoreBadge value={s.bestScore} size="sm" />
                  {effectivelyAdded ? (
                    <span className="flex shrink-0 items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-[11px] text-white/40">
                      <Check size={12} />
                      追加済
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleAdd(s.id)}
                      disabled={rs.kind === "adding"}
                      className="flex shrink-0 items-center gap-1 rounded-md border border-neon-pink/40 bg-neon-pink/10 px-2 py-1 text-[11px] font-semibold text-neon-pink disabled:opacity-50"
                    >
                      <Plus size={12} />
                      {rs.kind === "adding" ? "追加中" : "追加"}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={onDone}
          className="rounded-md px-3 py-1.5 text-xs text-white/70 hover:bg-white/5"
        >
          閉じる
        </button>
      </div>
    </div>
  );
}
