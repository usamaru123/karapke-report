"use client";

import { AlertCircle, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setDisplayName } from "@/lib/actions/profile";

type Props = {
  initial: string | null;
};

type Feedback = { kind: "success" } | { kind: "error"; message: string } | null;

export function DisplayNameForm({ initial }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(initial ?? "");
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback>(null);

  // "dirty" check — disable submit if the value is unchanged from the
  // persisted one. Prevents pointless writes.
  const trimmed = value.trim();
  const dirty = trimmed !== (initial ?? "").trim();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty) return;
    setFeedback(null);
    startTransition(async () => {
      try {
        await setDisplayName(value);
        setFeedback({ kind: "success" });
        router.refresh();
      } catch (e) {
        setFeedback({
          kind: "error",
          message: e instanceof Error ? e.message : "保存に失敗しました",
        });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="表示名 (最大 40 文字)"
          maxLength={40}
          autoComplete="off"
          className="flex-1 rounded-md border border-white/10 bg-bg-elevated px-3 py-2 text-sm text-white outline-none focus:border-neon-cyan"
        />
        <button
          type="submit"
          disabled={isPending || !dirty || trimmed.length === 0}
          className="rounded-md border border-neon-cyan/40 bg-neon-cyan/10 px-4 py-2 text-sm font-semibold text-neon-cyan shadow-glow-cyan disabled:opacity-40"
        >
          {isPending ? "保存中..." : "保存"}
        </button>
      </div>

      {feedback?.kind === "success" && (
        <p className="flex items-center gap-2 rounded border border-neon-green/40 bg-neon-green/10 px-3 py-2 text-xs text-neon-green">
          <Check size={14} />
          保存しました。
        </p>
      )}
      {feedback?.kind === "error" && (
        <p className="flex items-center gap-2 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          <AlertCircle size={14} />
          {feedback.message}
        </p>
      )}
    </form>
  );
}
