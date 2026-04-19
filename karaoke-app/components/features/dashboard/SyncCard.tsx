"use client";

import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { AlertCircle, Check, Download } from "lucide-react";
import { useState, useTransition } from "react";
import { triggerSync } from "@/lib/actions/sync";

type Props = { lastSyncAt: string | null };

type Feedback =
  | { kind: "success"; fetched: number; added: number }
  | { kind: "error"; message: string }
  | null;

export function SyncCard({ lastSyncAt }: Props) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback>(null);

  const lastLine = lastSyncAt
    ? `最終取込: ${format(new Date(lastSyncAt), "M月d日 HH:mm", { locale: ja })}`
    : "最終取込: 未実行";

  function handleSync() {
    setFeedback(null);
    startTransition(async () => {
      try {
        const result = await triggerSync();
        setFeedback({
          kind: "success",
          fetched: result.fetched,
          added: result.new,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "取り込み失敗";
        setFeedback({ kind: "error", message: msg });
      }
    });
  }

  return (
    <section className="rounded-xl border border-white/10 bg-bg-surface p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
        <span className="text-white/50">精密採点 AI 履歴</span>
      </h2>
      <p className="mt-1 text-xs text-white/50">{lastLine}</p>
      <button
        type="button"
        onClick={handleSync}
        disabled={isPending}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-neon-cyan/40 bg-neon-cyan/10 px-4 py-2 text-sm font-semibold text-neon-cyan shadow-glow-cyan transition-opacity hover:bg-neon-cyan/15 disabled:opacity-50"
      >
        <Download size={14} />
        {isPending ? "取り込み中..." : "データを取り込む"}
      </button>

      {feedback?.kind === "success" && (
        <p className="mt-3 flex items-center gap-2 rounded-md border border-neon-green/40 bg-neon-green/10 px-3 py-2 text-xs text-neon-green">
          <Check size={14} />
          取り込み完了: 新規 {feedback.added} 件 / 取得 {feedback.fetched} 件
        </p>
      )}
      {feedback?.kind === "error" && (
        <div className="mt-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          <p className="flex items-center gap-2 font-semibold">
            <AlertCircle size={14} />
            取り込み失敗: {feedback.message}
          </p>
          <p className="mt-1 text-[10px] text-red-300/70">
            sync-scores Edge Function が未デプロイ (P5-01) の場合は予想された失敗です。
          </p>
        </div>
      )}
    </section>
  );
}
