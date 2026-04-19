"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createSetlist } from "@/lib/actions/setlists";

export function NewSetlistForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError("セトリ名を入力してください");
      return;
    }
    startTransition(async () => {
      try {
        const created = await createSetlist({
          name: trimmed,
          scheduledFor: scheduledFor || undefined,
        });
        router.push(`/setlists/${created.id}`);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "作成に失敗しました");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-sm">
      <label className="flex flex-col gap-1">
        <span className="text-xs text-white/60">セトリ名 *</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
          placeholder="4月のカラオケ練習"
          className="rounded-md border border-white/10 bg-bg-elevated px-3 py-2 text-white outline-none focus:border-neon-cyan"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-white/60">予定日 (任意)</span>
        <input
          type="date"
          value={scheduledFor}
          onChange={(e) => setScheduledFor(e.target.value)}
          className="rounded-md border border-white/10 bg-bg-elevated px-3 py-2 text-white outline-none focus:border-neon-cyan"
        />
      </label>

      {error && (
        <p className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Link
          href="/setlists"
          className="rounded-md px-3 py-1.5 text-sm text-white/70 hover:bg-white/5"
        >
          キャンセル
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-neon-pink px-4 py-1.5 text-sm font-semibold text-black shadow-glow-pink disabled:opacity-50"
        >
          {isPending ? "作成中..." : "作成"}
        </button>
      </div>
    </form>
  );
}
