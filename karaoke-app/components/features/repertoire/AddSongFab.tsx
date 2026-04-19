"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { AddSongModal } from "@/components/features/repertoire/add-song/AddSongModal";
import type { AddableSong } from "@/lib/queries/repertoire";

type Props = { addableSongs: AddableSong[] };

export function AddSongFab({ addableSongs }: Props) {
  const [open, setOpen] = useState(false);

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

      <AddSongModal
        open={open}
        onClose={() => setOpen(false)}
        addableSongs={addableSongs}
      />
    </>
  );
}
