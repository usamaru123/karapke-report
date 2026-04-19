import { ListMusic, Search } from "lucide-react";

type Props = {
  variant: "empty_catalog" | "empty_search";
  onClearSearchHref?: string;
};

export function EmptyState({ variant, onClearSearchHref }: Props) {
  if (variant === "empty_search") {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
        <Search className="text-white/30" size={32} />
        <p className="text-sm text-white/70">該当する曲がありません</p>
        {onClearSearchHref && (
          <a
            href={onClearSearchHref}
            className="text-xs text-neon-cyan hover:underline"
          >
            検索条件をクリア
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 px-4 py-16 text-center">
      <ListMusic className="text-white/30" size={40} />
      <p className="max-w-sm text-sm text-white/70">
        まだレパートリーがありません。
        <br />
        採点履歴から追加するか、手動で追加してください。
      </p>
    </div>
  );
}
