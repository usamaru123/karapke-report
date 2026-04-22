import { FilterChips } from "@/components/features/repertoire/FilterChips";
import { FilterSummaryBar } from "@/components/features/repertoire/FilterSummaryBar";
import { RepertoireList } from "@/components/features/repertoire/RepertoireList";
import { SearchBar } from "@/components/features/repertoire/SearchBar";
import { SortMenu } from "@/components/features/repertoire/SortMenu";
import {
  getRepertoire,
  parseConfidenceFilter,
  parseRangeFilter,
  parseSort,
  parseStatusFilter,
} from "@/lib/queries/repertoire";
import { getUserVocalRange } from "@/lib/queries/user_range";

export default async function RepertoirePage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    confidence?: string;
    range?: string;
    sort?: string;
    q?: string;
  }>;
}) {
  const sp = await searchParams;
  const status = parseStatusFilter(sp.status);
  const confidence = parseConfidenceFilter(sp.confidence);
  const range = parseRangeFilter(sp.range);
  const sort = parseSort(sp.sort);
  const q = (sp.q ?? "").trim();

  const [items, userRange] = await Promise.all([
    getRepertoire({ status, confidence, range, sort, search: q || undefined }),
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

      <FilterChips status={status} confidence={confidence} range={range} />

      <FilterSummaryBar
        status={status}
        confidence={confidence}
        range={range}
        search={q}
        total={items.length}
      />

      <div className="flex items-center justify-end px-4 py-2 text-xs">
        <SortMenu active={sort} />
      </div>

      <RepertoireList
        items={items}
        userRange={userRange}
        isSearch={q.length > 0}
        clearSearchHref="/repertoire"
      />
    </div>
  );
}
