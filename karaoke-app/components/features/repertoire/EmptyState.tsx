import { ListMusic, Search } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

type Props = {
  variant: "empty_catalog" | "empty_search";
  onClearSearchHref?: string;
};

/**
 * Thin wrapper around the shared EmptyState for two repertoire-specific
 * situations. We intentionally don't surface an "曲を追加" CTA on
 * `empty_catalog` because the FAB is already present on this page — a
 * second button would be redundant and divide the user's attention.
 */
export function RepertoireEmptyState({ variant, onClearSearchHref }: Props) {
  if (variant === "empty_search") {
    return (
      <EmptyState
        icon={Search}
        title="該当する曲がありません"
        description="検索条件やフィルタを変えてみてください。"
        secondary={
          onClearSearchHref
            ? { label: "検索条件をクリア", href: onClearSearchHref }
            : undefined
        }
        variant="plain"
      />
    );
  }

  return (
    <EmptyState
      icon={ListMusic}
      title="まだレパートリーがありません"
      description="右下の「+ 曲を追加」ボタンから登録。歌った曲は自動で追加されます。"
      variant="plain"
    />
  );
}

// Preserve the old default-export name so RepertoireList's import still
// resolves while we migrate call sites.
export { RepertoireEmptyState as EmptyState };
