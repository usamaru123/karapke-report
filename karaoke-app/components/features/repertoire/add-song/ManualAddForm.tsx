"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addToRepertoire } from "@/lib/actions/repertoire";
import { formatKey } from "@/lib/format";

type Props = { onDone: () => void };

export function ManualAddForm({ onDone }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [requestNo, setRequestNo] = useState("");
  const [key, setKey] = useState(0);
  const [tags, setTags] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim() || !artist.trim()) {
      setError("曲名とアーティストは必須です");
      return;
    }
    startTransition(async () => {
      try {
        await addToRepertoire({
          manualTitle: title.trim(),
          manualArtist: artist.trim(),
          manualRequestNo: requestNo.trim() || undefined,
        });
        // NOTE: updateRepertoireMeta for key/tags is skipped here; the backend
        // addToRepertoire only accepts title/artist/requestNo. Key and tags
        // can be edited from the detail page afterwards.
        router.refresh();
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "追加に失敗しました");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 text-sm">
      <Field label="曲名 *">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full rounded-md border border-white/10 bg-bg-elevated px-2 py-1.5 text-white outline-none focus:border-neon-cyan"
        />
      </Field>
      <Field label="アーティスト *">
        <input
          type="text"
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
          required
          className="w-full rounded-md border border-white/10 bg-bg-elevated px-2 py-1.5 text-white outline-none focus:border-neon-cyan"
        />
      </Field>
      <Field label="配信番号">
        <input
          type="text"
          value={requestNo}
          onChange={(e) => setRequestNo(e.target.value)}
          placeholder="1309-12"
          className="w-full rounded-md border border-white/10 bg-bg-elevated px-2 py-1.5 text-white outline-none focus:border-neon-cyan"
        />
      </Field>
      <Field label={`キー (${formatKey(key)})`}>
        <input
          type="range"
          min={-6}
          max={6}
          step={1}
          value={key}
          onChange={(e) => setKey(Number(e.target.value))}
          className="w-full accent-neon-pink"
        />
      </Field>
      <Field label="タグ" hint="カンマ区切り">
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="J-POP, 十八番"
          className="w-full rounded-md border border-white/10 bg-bg-elevated px-2 py-1.5 text-white outline-none focus:border-neon-cyan"
        />
      </Field>

      <p className="rounded border border-white/5 bg-white/5 px-3 py-2 text-[11px] text-white/50">
        キー・タグ・メモは追加後、詳細画面の編集から設定できます（MVP 制約）。
      </p>

      {error && (
        <p className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onDone}
          disabled={isPending}
          className="rounded-md px-3 py-1.5 text-xs text-white/70 hover:bg-white/5 disabled:opacity-50"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-neon-pink px-4 py-1.5 text-xs font-semibold text-black shadow-glow-pink disabled:opacity-50"
        >
          {isPending ? "追加中..." : "追加する"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="flex items-baseline gap-2 text-xs text-white/60">
        {label}
        {hint && <span className="text-[10px] text-white/40">{hint}</span>}
      </span>
      {children}
    </label>
  );
}
