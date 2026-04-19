"use client";

import { Pin } from "lucide-react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { togglePinSetlist } from "@/lib/actions/setlists";

type Props = {
  setlistId: string;
  pinned: boolean;
};

export function PinToggle({ setlistId, pinned }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      try {
        await togglePinSetlist(setlistId, !pinned);
        router.refresh();
      } catch {
        /* fallback: silently ignore for MVP */
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={pinned ? "ピン留めを解除" : "ピン留めする"}
      aria-pressed={pinned}
      disabled={isPending}
      className={`flex h-8 w-8 items-center justify-center rounded transition-colors ${
        pinned
          ? "text-neon-cyan"
          : "text-white/40 hover:text-white"
      } disabled:opacity-50`}
    >
      <Pin
        size={16}
        className={pinned ? "fill-neon-cyan" : ""}
      />
    </button>
  );
}
