import { defineConfig } from "vitest/config";

// Pure-logic Unit testing only for now.
// - `environment: "node"` (not jsdom) — we don't test React components here.
//   Switch to "jsdom" per-file via `// @vitest-environment jsdom` or bump
//   this default when component tests get added (also install
//   @vitejs/plugin-react, jsdom, @testing-library/react at that point).
// - `resolve.tsconfigPaths: true` makes `@/...` imports resolve the same as
//   in app code (Vite native, supersedes the `vite-tsconfig-paths` plugin
//   that Vitest 4 deprecated).
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    typecheck: {
      enabled: false,
    },
  },
});
