"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { updateRepertoireMeta } from "@/lib/actions/repertoire";
import { ConfidenceStars } from "@/components/ui/ConfidenceStars";
import { formatKey } from "@/lib/format";
import type { ConfidenceLevel, Repertoire } from "@/types/domain";

type Props = {
  repertoire: Repertoire;
  editing: boolean;
};

const CONFIDENCE_OPTIONS: { value: ConfidenceLevel; label: string }[] = [
  { value: "practicing", label: "練習中" },
  { value: "normal", label: "普通" },
  { value: "confident", label: "得意" },
];

export function MetaInfoPanel({ repertoire, editing }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [key, setKey] = useState(repertoire.preferred_key);
  const [confidence, setConfidence] = useState<ConfidenceLevel>(
    repertoire.confidence,
  );
  const [tagsInput, setTagsInput] = useState(repertoire.tags.join(", "));
  const [memo, setMemo] = useState(repertoire.memo ?? "");
  const [error, setError] = useState<string | null>(null);

  function exitEdit() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("edit");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function handleSave() {
    setError(null);
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    startTransition(async () => {
      try {
        await updateRepertoireMeta(repertoire.id, {
          preferred_key: key,
          confidence,
          tags,
          memo: memo.trim() === "" ? null : memo.trim(),
        });
        exitEdit();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "更新に失敗しました");
      }
    });
  }

  if (!editing) {
    return (
      <section className="px-4 py-2">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">
          メタ情報
        </h3>
        <dl className="space-y-2 text-sm">
          <div className="flex gap-3">
            <dt className="w-24 shrink-0 text-white/50">キー設定</dt>
            <dd className="text-white">{formatKey(repertoire.preferred_key)}</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-24 shrink-0 text-white/50">自信度</dt>
            <dd>
              <ConfidenceStars level={repertoire.confidence} />
            </dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-24 shrink-0 text-white/50">タグ</dt>
            <dd className="flex flex-wrap gap-1.5">
              {repertoire.tags.length === 0 ? (
                <span className="text-white/40">—</span>
              ) : (
                repertoire.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-white/70"
                  >
                    #{t}
                  </span>
                ))
              )}
            </dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-24 shrink-0 text-white/50">メモ</dt>
            <dd className="whitespace-pre-wrap text-white/80">
              {repertoire.memo ?? <span className="text-white/40">—</span>}
            </dd>
          </div>
        </dl>
      </section>
    );
  }

  return (
    <section className="px-4 py-2">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neon-cyan">
        メタ情報 — 編集中
      </h3>
      <div className="space-y-4 text-sm">
        <label className="flex items-center gap-3">
          <span className="w-24 shrink-0 text-white/60">
            キー ({formatKey(key)})
          </span>
          <input
            type="range"
            min={-6}
            max={6}
            step={1}
            value={key}
            onChange={(e) => setKey(Number(e.target.value))}
            className="flex-1 accent-neon-pink"
          />
        </label>

        <div className="flex items-center gap-3">
          <span className="w-24 shrink-0 text-white/60">自信度</span>
          <div className="flex flex-1 overflow-hidden rounded-md border border-white/10">
            {CONFIDENCE_OPTIONS.map((opt) => {
              const on = opt.value === confidence;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setConfidence(opt.value)}
                  className={`flex-1 px-3 py-1.5 text-xs transition-colors ${
                    on
                      ? "bg-neon-pink/20 text-neon-pink"
                      : "text-white/60 hover:bg-white/5"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <label className="flex items-start gap-3">
          <span className="w-24 shrink-0 pt-2 text-white/60">
            タグ
            <span className="block text-[10px] text-white/40">
              カンマ区切り
            </span>
          </span>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="J-POP, 十八番"
            className="flex-1 rounded-md border border-white/10 bg-bg-elevated px-2 py-1.5 text-sm text-white outline-none focus:border-neon-cyan"
          />
        </label>

        <label className="flex items-start gap-3">
          <span className="w-24 shrink-0 pt-2 text-white/60">メモ</span>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={3}
            className="flex-1 rounded-md border border-white/10 bg-bg-elevated px-2 py-1.5 text-sm text-white outline-none focus:border-neon-cyan"
          />
        </label>

        {error && (
          <p className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={exitEdit}
            disabled={isPending}
            className="rounded-md px-3 py-1.5 text-xs text-white/70 hover:bg-white/5 disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="rounded-md bg-neon-pink px-3 py-1.5 text-xs font-semibold text-black shadow-glow-pink disabled:opacity-50"
          >
            {isPending ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </section>
  );
}
