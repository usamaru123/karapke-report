"use client";

import { Plus } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AddSongModal } from "@/components/features/repertoire/add-song/AddSongModal";

// Pages where the FAB provides useful context. We're explicit rather than
// using a blocklist so adding new pages doesn't accidentally inherit the FAB.
const SHOW_ON_EXACT = new Set([
  "/",
  "/repertoire",
  "/history",
  "/stats",
  "/setlists",
]);

/**
 * App-wide floating "+ 曲を追加" button. Replaces the per-page `AddSongFab`
 * that only lived on /repertoire; now the action is one tap away from Home,
 * History, and the stats drill-downs too.
 *
 * Hidden on surfaces where adding a song doesn't fit the current intent
 * (settings, detail pages, editors, auth).
 */
export function GlobalAddFab() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const show = SHOW_ON_EXACT.has(pathname);
  if (!show) return null;

  return (
    <>
      <button
        type="button"
        aria-label="曲を追加"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-neon-pink to-neon-purple text-white shadow-glow-pink transition-transform hover:scale-105 active:scale-95 md:bottom-8"
      >
        <Plus size={26} />
      </button>

      <AddSongModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
