"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset } from "./actions";

export function ForgotForm() {
  const [state, formAction, pending] = useActionState(
    requestPasswordReset,
    null,
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-base p-4">
      <form
        action={formAction}
        className="w-80 rounded-xl border border-white/10 bg-bg-surface p-6 shadow-glow-pink-soft"
      >
        <h1 className="mb-1 text-center text-xl font-semibold text-neon-pink neon-text-pink">
          パスワード再設定
        </h1>
        <p className="mb-6 text-center text-xs text-white/60">
          登録済みメールアドレスに再設定リンクを送信します。
        </p>

        {state && "error" in state && (
          <p className="mb-4 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {state.error}
          </p>
        )}
        {state && "ok" in state && (
          <p className="mb-4 rounded border border-neon-green/40 bg-neon-green/10 px-3 py-2 text-xs text-neon-green">
            再設定リンクをメールで送信しました（登録済みの場合）。メールボックスを確認してください。
          </p>
        )}

        <label className="mb-6 block">
          <span className="mb-1 block text-xs text-white/70">Email</span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="w-full rounded-md border border-white/10 bg-bg-elevated px-3 py-2 text-sm text-white outline-none focus:border-neon-cyan"
          />
        </label>

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-neon-pink px-3 py-2 text-sm font-semibold text-black shadow-glow-pink disabled:opacity-50"
        >
          {pending ? "送信中..." : "再設定リンクを送信"}
        </button>

        <p className="mt-4 text-center text-xs text-white/50">
          <Link href="/login" className="text-neon-cyan hover:underline">
            ログインに戻る
          </Link>
        </p>
      </form>
    </main>
  );
}
