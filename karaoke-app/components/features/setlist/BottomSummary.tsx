import type { SetlistDetailItem } from "@/lib/queries/setlists";

type Props = { items: SetlistDetailItem[] };

const DEFAULT_SONG_SECONDS = 240;

export function BottomSummary({ items }: Props) {
  const total = items.reduce(
    (sum, it) => sum + (it.song?.duration_sec ?? DEFAULT_SONG_SECONDS),
    0,
  );
  const mins = Math.round(total / 60);

  return (
    <div className="fixed inset-x-0 bottom-20 z-10 border-t border-white/10 bg-bg-surface/90 px-4 py-3 backdrop-blur md:bottom-0 md:left-56">
      <div className="mx-auto flex max-w-3xl items-center justify-between text-sm">
        <span className="text-white/70 tabular-nums">
          {items.length} 曲
          <span className="mx-2 text-white/30">·</span>
          <span className="text-white">
            {items.length === 0 ? "—" : `約${mins}分`}
          </span>
        </span>
        {items.length === 0 && (
          <span className="text-xs text-white/50">
            下のボタンから曲を追加
          </span>
        )}
      </div>
    </div>
  );
}
