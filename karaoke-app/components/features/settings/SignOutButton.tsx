"use client";

import { LogOut } from "lucide-react";
import { useTransition } from "react";
import { signOut } from "@/lib/actions/profile";

export function SignOutButton() {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (isPending) return;
    if (!confirm("サインアウトしますか？")) return;
    startTransition(async () => {
      await signOut();
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="flex w-full items-center justify-center gap-2 rounded-md border border-red-500/30 px-4 py-2 text-sm text-red-300 hover:bg-red-500/10 disabled:opacity-40"
    >
      <LogOut size={14} />
      {isPending ? "サインアウト中..." : "サインアウト"}
    </button>
  );
}
