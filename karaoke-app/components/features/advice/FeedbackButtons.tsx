"use client";

import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useState, useTransition } from "react";
import {
  clearAdviceVote,
  setAdviceVote,
} from "@/lib/actions/advice-feedback";

type Props = {
  ruleId: string;
  /** Initial vote from the server fetch. null = no vote cast yet. */
  initialVote: 1 | -1 | null;
};

/**
 * Thumbs-up / thumbs-down pair for an advice finding. Optimistic UI: the
 * visual state flips immediately, the server action runs in a transition,
 * and any error rolls the vote back. Voting the same direction twice clears
 * the vote (toggle behavior).
 */
export function FeedbackButtons({ ruleId, initialVote }: Props) {
  const [vote, setVote] = useState<1 | -1 | null>(initialVote);
  const [isPending, startTransition] = useTransition();

  function cast(next: 1 | -1) {
    const prior = vote;
    const wasSame = prior === next;
    // Optimistic update
    setVote(wasSame ? null : next);
    startTransition(async () => {
      try {
        if (wasSame) {
          await clearAdviceVote(ruleId);
        } else {
          await setAdviceVote(ruleId, next);
        }
      } catch {
        // Revert on failure
        setVote(prior);
      }
    });
  }

  const btnBase =
    "flex h-6 w-6 items-center justify-center rounded transition-colors";
  return (
    <span
      className="inline-flex items-center gap-1"
      aria-label="このアドバイスは役に立ちましたか"
    >
      <button
        type="button"
        onClick={() => cast(1)}
        disabled={isPending}
        aria-pressed={vote === 1}
        className={`${btnBase} ${
          vote === 1
            ? "bg-neon-green/20 text-neon-green"
            : "text-white/30 hover:bg-white/5 hover:text-white/60"
        }`}
      >
        <ThumbsUp size={12} />
      </button>
      <button
        type="button"
        onClick={() => cast(-1)}
        disabled={isPending}
        aria-pressed={vote === -1}
        className={`${btnBase} ${
          vote === -1
            ? "bg-red-500/20 text-red-300"
            : "text-white/30 hover:bg-white/5 hover:text-white/60"
        }`}
      >
        <ThumbsDown size={12} />
      </button>
    </span>
  );
}
