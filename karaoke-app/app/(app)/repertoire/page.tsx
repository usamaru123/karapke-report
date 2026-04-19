import { AddSongFab } from "@/components/features/repertoire/AddSongFab";
import { FilterChips } from "@/components/features/repertoire/FilterChips";
import { RepertoireList } from "@/components/features/repertoire/RepertoireList";
import { SearchBar } from "@/components/features/repertoire/SearchBar";
import { SortMenu } from "@/components/features/repertoire/SortMenu";
import {
  getAddableScoredSongs,
  getRepertoire,
  type RepertoireFilter,
  type RepertoireSort,
} from "@/lib/queries/repertoire";

const FILTERS: readonly RepertoireFilter[] = [
  "all",
  "over90",
  "recent",
  "favorite",
];
const SORTS: readonly RepertoireSort[] = [
  "best_score",
  "recent",
  "title",
  "added",
];

function parseFilter(v: string | undefined): RepertoireFilter {
  return (FILTERS as readonly string[]).includes(v ?? "")
    ? (v as RepertoireFilter)
    : "all";
}
function parseSort(v: string | undefined): RepertoireSort {
  return (SORTS as readonly string[]).includes(v ?? "")
    ? (v as RepertoireSort)
    : "best_score";
}

export default async function RepertoirePage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; sort?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const filter = parseFilter(sp.filter);
  const sort = parseSort(sp.sort);
  const q = (sp.q ?? "").trim();

  const [items, addableSongs] = await Promise.all([
    getRepertoire({ filter, sort, search: q || undefined }),
    getAddableScoredSongs(),
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

      <FilterChips active={filter} />

      <div className="flex items-center justify-end px-4 py-2 text-xs">
        <SortMenu active={sort} />
      </div>

      <RepertoireList
        items={items}
        isSearch={q.length > 0}
        clearSearchHref="/repertoire"
      />

      <AddSongFab addableSongs={addableSongs} />
    </div>
  );
}
