"use client";

// Root-level error boundary used when the root layout or a route above
// app/(app)/error.tsx throws. Must define its own <html>/<body> because it
// replaces the root layout. See:
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md

import { useEffect } from "react";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("global error:", error);
  }, [error]);

  return (
    <html lang="ja">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background: "#0a0a14",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          padding: "1rem",
        }}
      >
        <div style={{ maxWidth: 400, textAlign: "center" }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
            予期しないエラーが発生しました
          </h2>
          <p style={{ marginTop: 12, fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
            アプリの初期化に失敗しました。ページを再読み込みしてください。
          </p>
          {error.digest && (
            <p
              style={{
                marginTop: 8,
                fontSize: 10,
                fontFamily: "monospace",
                color: "rgba(255,255,255,0.3)",
              }}
            >
              ref: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={() => unstable_retry()}
            style={{
              marginTop: 16,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              color: "#22d3ee",
              background: "rgba(34,211,238,0.1)",
              border: "1px solid rgba(34,211,238,0.4)",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            リトライ
          </button>
        </div>
      </body>
    </html>
  );
}
