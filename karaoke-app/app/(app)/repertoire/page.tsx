import { AddSongFab } from "@/components/features/repertoire/AddSongFab";
import { FilterChips } from "@/components/features/repertoire/FilterChips";
import { RepertoireList } from "@/components/features/repertoire/RepertoireList";
import { SearchBar } from "@/components/features/repertoire/SearchBar";
import { SortMenu } from "@/components/features/repertoire/SortMenu";
import {
  getRepertoire,
  parseConfidenceFilter,
  parseStatusFilter,
  type RepertoireSort,
} from "@/lib/queries/repertoire";
import { getUserVocalRange } from "@/lib/queries/user_range";

const SORTS: readonly RepertoireSort[] = [
  "best_score",
  "recent",
  "title",
  "added",
];

function parseSort(v: string | undefined): RepertoireSort {
  return (SORTS as readonly string[]).includes(v ?? "")
    ? (v as RepertoireSort)
    : "best_score";
}

export default async function RepertoirePage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    confidence?: string;
    sort?: string;
    q?: string;
  }>;
}) {
  const sp = await searchParams;
  const status = parseStatusFilter(sp.status);
  const confidence = parseConfidenceFilter(sp.confidence);
  const sort = parseSort(sp.sort);
  const q = (sp.q ?? "").trim();

  const [items, userRange] = await Promise.all([
    getRepertoire({ status, confidence, sort, search: q || undefined }),
    getUserVocalRange(),
  ]);

  return (
    <div className="pb-24 md:pb-6">
      <header className="flex items-center justify-between gap-2 px-4 pt-6 pb-3">
        <h1 className="shrink-0 text-xl font-semibold text-white">
          レパートリー{" "}
          <span className="ml-1 text-sm text-white/50 tabular-nums">
            ({items.length})
          </span>
        </h1>
        <SearchBar initialQuery={q} />
      </header>

      <FilterChips status={status} confidence={confidence} />

      <div className="flex items-center justify-end px-4 py-2 text-xs">
        <SortMenu active={sort} />
      </div>

      <RepertoireList
        items={items}
        userRange={userRange}
        isSearch={q.length > 0}
        clearSearchHref="/repertoire"
      />

      <AddSongFab />
    </div>
  );
}
