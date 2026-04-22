import { BookTemplate, Plus } from "lucide-react";
import Link from "next/link";
import { SetlistEmptyState } from "@/components/features/setlist/EmptyState";
import { SetlistCard } from "@/components/features/setlist/SetlistCard";
import { getSetlists } from "@/lib/queries/setlists";

export default async function SetlistsPage() {
  const [setlists, templates] = await Promise.all([
    getSetlists(),
    getSetlists({ templates: true }),
  ]);
  const pinned = setlists.filter((s) => s.is_pinned);
  const saved = setlists.filter((s) => !s.is_pinned);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 pt-6 pb-24 md:pb-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">
          セットリスト{" "}
          <span className="ml-1 text-sm text-white/50 tabular-nums">
            ({setlists.length})
          </span>
        </h1>
        <Link
          href="/setlists/new"
          className="flex items-center gap-1 rounded-md border border-neon-cyan/40 bg-neon-cyan/10 px-3 py-1.5 text-xs font-semibold text-neon-cyan hover:bg-neon-cyan/15"
        >
          <Plus size={12} />
          新規
        </Link>
      </header>

      {setlists.length === 0 && templates.length === 0 ? (
        <SetlistEmptyState />
      ) : (
        <>
          {pinned.length > 0 && (
            <section>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neon-cyan">
                📌 次回用
              </h2>
              <div className="space-y-2">
                {pinned.map((s) => (
                  <SetlistCard key={s.id} setlist={s} />
                ))}
              </div>
            </section>
          )}

          {saved.length > 0 && (
            <section>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">
                保存済み
              </h2>
              <div className="space-y-2">
                {saved.map((s) => (
                  <SetlistCard key={s.id} setlist={s} />
                ))}
              </div>
            </section>
          )}

          {templates.length > 0 && (
            <section>
              <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-neon-amber">
                <BookTemplate size={12} />
                テンプレート
              </h2>
              <p className="mb-2 text-[11px] text-white/40">
                「新規」→「テンプレから作成」で複製できます。
              </p>
              <div className="space-y-2">
                {templates.map((s) => (
                  <SetlistCard key={s.id} setlist={s} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
