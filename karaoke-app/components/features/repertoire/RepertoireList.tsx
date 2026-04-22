import { RepertoireCard } from "./RepertoireCard";
import { EmptyState } from "./EmptyState";
import type { RepertoireWithMeta } from "@/lib/queries/repertoire";
import type { UserVocalRange } from "@/lib/queries/user_range";

type Props = {
  items: RepertoireWithMeta[];
  userRange: UserVocalRange;
  isSearch: boolean;
  clearSearchHref: string;
};

export function RepertoireList({
  items,
  userRange,
  isSearch,
  clearSearchHref,
}: Props) {
  if (items.length === 0) {
    return (
      <EmptyState
        variant={isSearch ? "empty_search" : "empty_catalog"}
        onClearSearchHref={isSearch ? clearSearchHref : undefined}
      />
    );
  }
  return (
    <ul className="divide-y divide-white/10 border-t border-white/10">
      {items.map((item) => (
        <li key={item.id}>
          <RepertoireCard item={item} userRange={userRange} />
        </li>
      ))}
    </ul>
  );
}
