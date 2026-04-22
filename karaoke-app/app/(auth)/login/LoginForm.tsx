"use client";

import { useActionState } from "react";
import { signIn } from "./actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, null);

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-base p-4">
      <form
        action={formAction}
        className="w-80 rounded-xl border border-white/10 bg-bg-surface p-6 shadow-glow-pink-soft"
      >
        <h1 className="mb-1 text-center text-xl font-semibold text-neon-pink neon-text-pink">
          カラオケレパ
        </h1>
        <p className="mb-6 text-center text-xs text-white/60">
          サインインして続けてください
        </p>

        {state?.error && (
          <p className="mb-4 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {state.error}
          </p>
        )}

        <label className="mb-3 block">
          <span className="mb-1 block text-xs text-white/70">Email</span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="w-full rounded-md border border-white/10 bg-bg-elevated px-3 py-2 text-sm text-white outline-none focus:border-neon-cyan"
          />
        </label>

        <label className="mb-6 block">
          <span className="mb-1 block text-xs text-white/70">Password</span>
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            className="w-full rounded-md border border-white/10 bg-bg-elevated px-3 py-2 text-sm text-white outline-none focus:border-neon-cyan"
          />
        </label>

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-neon-pink px-3 py-2 text-sm font-semibold text-black shadow-glow-pink disabled:opacity-50"
        >
          {pending ? "サインイン中..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
