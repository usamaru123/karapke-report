"use client";

import { ChevronLeft, Pencil, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Props = {
  editing: boolean;
};

export function DetailHeader({ editing }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function toggle() {
    const params = new URLSearchParams(searchParams.toString());
    if (editing) params.delete("edit");
    else params.set("edit", "1");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <header className="flex items-center justify-between px-2 pt-4 pb-2">
      <Link
        href="/repertoire"
        aria-label="レパートリーに戻る"
        className="flex h-9 w-9 items-center justify-center rounded-md text-white/80 hover:bg-white/5 hover:text-white"
      >
        <ChevronLeft size={22} />
      </Link>
      <h1 className="text-sm text-white/60">詳細</h1>
      <button
        type="button"
        onClick={toggle}
        aria-label={editing ? "編集をやめる" : "メタ情報を編集"}
        className="flex h-9 items-center justify-center gap-1 rounded-md px-3 text-sm text-neon-cyan hover:bg-white/5"
      >
        {editing ? <X size={16} /> : <Pencil size={14} />}
        <span>{editing ? "キャンセル" : "編集"}</span>
      </button>
    </header>
  );
}
