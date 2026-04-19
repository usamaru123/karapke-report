"use client";

import { useSortable } from "@dnd-kit/sortable";
import { GripVertical, Trash2 } from "lucide-react";
import { KeyBadge } from "@/components/ui/KeyBadge";
import type { SetlistDetailItem } from "@/lib/queries/setlists";

// Inline equivalent of @dnd-kit/utilities' CSS.Transform.toString
// (the utilities package is not installed as a transitive peer dep here).
function transformToCss(
  t: { x: number; y: number; scaleX: number; scaleY: number } | null,
): string | undefined {
  if (!t) return undefined;
  return `translate3d(${Math.round(t.x)}px, ${Math.round(t.y)}px, 0) scaleX(${t.scaleX}) scaleY(${t.scaleY})`;
}

type Props = {
  item: SetlistDetailItem;
  order: number;
  onDelete: (itemId: string) => void;
  disabled?: boolean;
};

function formatDuration(sec: number | null | undefined): string {
  if (!sec || sec <= 0) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function SortableSetlistItem({
  item,
  order,
  onDelete,
  disabled,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled });

  const style: React.CSSProperties = {
    transform: transformToCss(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  const effectiveKey = item.key_override ?? 0;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-lg border bg-bg-surface px-2 py-2.5 ${
        isDragging
          ? "border-neon-cyan/60 shadow-glow-cyan"
          : "border-white/10"
      }`}
    >
      <button
        type="button"
        aria-label="ドラッグして並べ替え"
        {...attributes}
        {...listeners}
        className="flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded text-white/40 hover:bg-white/5 hover:text-white/70 active:cursor-grabbing"
      >
        <GripVertical size={16} />
      </button>
      <span className="w-6 shrink-0 text-center text-xs text-white/40 tabular-nums">
        {order}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm text-white">
          {item.song?.title ?? "—"}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-white/50">
          <span className="truncate">{item.song?.artist ?? "—"}</span>
          <KeyBadge value={effectiveKey} />
          {item.song?.duration_sec ? (
            <span className="shrink-0 tabular-nums text-white/40">
              {formatDuration(item.song.duration_sec)}
            </span>
          ) : null}
        </div>
        {item.note && (
          <p className="mt-1 truncate text-[11px] text-white/50">
            {item.note}
          </p>
        )}
      </div>
      <button
        type="button"
        aria-label="この曲を削除"
        onClick={() => onDelete(item.id)}
        disabled={disabled}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-red-300/70 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-40"
      >
        <Trash2 size={14} />
      </button>
    </li>
  );
}
