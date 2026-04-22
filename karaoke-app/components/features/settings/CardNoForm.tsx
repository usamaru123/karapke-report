"use client";

import { AlertCircle, Check } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setCdmCardNo } from "@/lib/actions/profile";

type Props = {
  hasCardNo: boolean;
  maskedSuffix: string | null; // last 4 chars if registered, else null
};

type Feedback =
  | { kind: "success" }
  | { kind: "error"; message: string }
  | null;

export function CardNoForm({ hasCardNo, maskedSuffix }: Props) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    startTransition(async () => {
      try {
        await setCdmCardNo(value);
        setValue("");
        setFeedback({ kind: "success" });
        router.refresh();
      } catch (e) {
        setFeedback({
          kind: "error",
          message: e instanceof Error ? e.message : "登録に失敗しました",
        });
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-white/10 bg-bg-surface px-3 py-2 text-sm">
        {hasCardNo ? (
          <p>
            <span className="text-white/50">現在:</span>{" "}
            <span className="font-mono text-neon-cyan">…{maskedSuffix}</span>
            <span className="ml-2 text-xs text-white/40">(登録済み)</span>
          </p>
        ) : (
          <p className="text-white/60">現在: 未登録</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={hasCardNo ? "新しい番号で上書き" : "DAM カード番号 (20 文字)"}
          autoComplete="off"
          className="flex-1 rounded-md border border-white/10 bg-bg-elevated px-3 py-2 text-sm text-white outline-none focus:border-neon-cyan"
        />
        <button
          type="submit"
          disabled={isPending || !value.trim()}
          className="rounded-md border border-neon-cyan/40 bg-neon-cyan/10 px-4 py-2 text-sm font-semibold text-neon-cyan shadow-glow-cyan disabled:opacity-40"
        >
          {isPending ? "保存中..." : hasCardNo ? "更新" : "登録"}
        </button>
      </form>

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

      <p className="text-[11px] text-white/40">
        このアプリは Supabase に保存します (plaintext, RLS スコープ)。
        Supabase Vault での暗号化は将来的に再導入予定。
      </p>
    </div>
  );
}
