"use client";

import { Dice5 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { randomFillSetlist } from "@/lib/actions/setlists";

type Props = {
  setlistId: string;
};

const PRESET_COUNTS = [3, 5, 10];

export function RandomFillButton({ setlistId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function fill(count: number) {
    setFeedback(null);
    startTransition(async () => {
      try {
        const { added, skipped } = await randomFillSetlist(
          setlistId,
          count,
        );
        if (added === 0) {
          setFeedback(
            "追加できる曲がレパートリーに見つかりません (全て登録済 or 対象外)",
          );
        } else {
          setFeedback(
            skipped > 0
              ? `${added} 曲追加 (${skipped} 曲は候補不足で省略)`
              : `${added} 曲追加しました`,
          );
        }
        router.refresh();
      } catch (e) {
        setFeedback(
          e instanceof Error ? `エラー: ${e.message}` : "追加に失敗しました",
        );
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-white/10 bg-bg-surface px-3 py-2 text-xs text-white/70 hover:border-white/25 hover:text-white"
      >
        <Dice5 size={13} />
        ランダムで追加
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-white/10 bg-bg-surface p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold text-white">
          何曲追加しますか？
        </p>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setFeedback(null);
          }}
          className="text-[10px] text-white/40 hover:text-white/70"
          disabled={isPending}
        >
          閉じる
        </button>
      </div>
      <p className="mb-2 text-[10px] text-white/40">
        対象: 歌いたい / 練習中 / 普通 / 得意 の曲。既存のセトリ曲は除外。
      </p>
      <div className="flex gap-2">
        {PRESET_COUNTS.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => fill(n)}
            disabled={isPending}
            className="flex-1 rounded-md border border-neon-cyan/40 bg-neon-cyan/10 px-3 py-1.5 text-xs font-semibold text-neon-cyan hover:bg-neon-cyan/15 disabled:opacity-50"
          >
            +{n}
          </button>
        ))}
      </div>
      {feedback && (
        <p className="mt-2 text-xs text-white/70">{feedback}</p>
      )}
    </div>
  );
}
