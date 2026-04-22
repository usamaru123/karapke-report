"use client";

// Route-segment-level error boundary for every (app) page. Wraps nested
// route content in a React Error Boundary. See app/global-error.tsx for the
// fallback used when the root layout itself throws.

import { AlertTriangle, RotateCw } from "lucide-react";
import { useEffect } from "react";

export default function AppError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    // Surface the error for server logs / observability. `digest` is the only
    // thing we can match against server logs in production; `message` is
    // redacted to a generic string for Server Component errors.
    console.error("(app) route error:", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-12 text-center">
      <AlertTriangle size={36} className="text-neon-amber" />
      <h2 className="text-lg font-semibold text-white">
        表示中にエラーが発生しました
      </h2>
      <p className="text-sm text-white/60">
        一時的な通信エラーやデータ不整合の可能性があります。リトライで復帰するか、問題が続く場合はサインアウトしてから再度お試しください。
      </p>
      {error.digest && (
        <p className="text-[10px] font-mono text-white/30">
          ref: {error.digest}
        </p>
      )}
      <button
        type="button"
        onClick={() => unstable_retry()}
        className="flex items-center gap-2 rounded-md border border-neon-cyan/40 bg-neon-cyan/10 px-4 py-2 text-sm font-semibold text-neon-cyan shadow-glow-cyan hover:bg-neon-cyan/15"
      >
        <RotateCw size={14} />
        リトライ
      </button>
    </div>
  );
}
