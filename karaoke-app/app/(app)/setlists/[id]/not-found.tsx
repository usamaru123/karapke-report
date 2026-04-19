import Link from "next/link";

export default function SetlistNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h2 className="text-lg font-semibold text-white">
        セットリストが見つかりません
      </h2>
      <p className="text-sm text-white/60">
        削除済みか、URL が間違っている可能性があります。
      </p>
      <Link
        href="/setlists"
        className="mt-2 rounded-md bg-neon-pink px-4 py-2 text-sm font-semibold text-black shadow-glow-pink"
      >
        セットリスト一覧へ
      </Link>
    </div>
  );
}
