// Shown as the Suspense fallback whenever any (app) route segment is
// fetching data on the server. Kept intentionally minimal — heavier route
// segments can add their own loading.tsx beside their page.tsx.
export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 pt-6 pb-24 md:pb-6">
      <div className="h-6 w-40 animate-pulse rounded bg-white/5" />
      <div className="h-40 animate-pulse rounded-2xl bg-white/5" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-20 animate-pulse rounded-xl bg-white/5" />
        <div className="h-20 animate-pulse rounded-xl bg-white/5" />
      </div>
      <div className="h-48 animate-pulse rounded-xl bg-white/5" />
      <p className="text-center text-xs text-white/40">読み込み中...</p>
    </div>
  );
}
