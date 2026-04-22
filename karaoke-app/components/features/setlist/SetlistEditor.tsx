"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  deleteSetlistItem,
  reorderSetlistItems,
} from "@/lib/actions/setlists";
import type { RepertoireWithMeta } from "@/lib/queries/repertoire";
import type { SetlistDetail, SetlistDetailItem } from "@/lib/queries/setlists";
import { AddItemToSetlistButton } from "./AddItemToSetlistButton";
import { BottomSummary } from "./BottomSummary";
import { RandomFillButton } from "./RandomFillButton";
import { SetlistHeader } from "./SetlistHeader";
import { SortableSetlistItem } from "./SortableSetlistItem";

type Props = {
  setlist: SetlistDetail;
  repertoire: RepertoireWithMeta[];
};

export function SetlistEditor({ setlist, repertoire }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<SetlistDetailItem[]>(setlist.items);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = items.findIndex((i) => i.id === active.id);
    const newIdx = items.findIndex((i) => i.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const next = arrayMove(items, oldIdx, newIdx);
    // Optimistic UI
    setItems(next);
    setError(null);
    startTransition(async () => {
      try {
        await reorderSetlistItems(
          setlist.id,
          next.map((i) => i.id),
        );
        router.refresh();
      } catch (e) {
        // Rollback optimistic state on failure
        setItems(items);
        setError(
          e instanceof Error ? e.message : "並べ替えに失敗しました",
        );
      }
    });
  }

  function handleDelete(itemId: string) {
    const prev = items;
    setItems(items.filter((i) => i.id !== itemId));
    setError(null);
    startTransition(async () => {
      try {
        await deleteSetlistItem(itemId, setlist.id);
        router.refresh();
      } catch (e) {
        setItems(prev);
        setError(e instanceof Error ? e.message : "削除に失敗しました");
      }
    });
  }

  const alreadyInSetlist = new Set(
    items.map((i) => i.song?.id).filter((v): v is string => !!v),
  );

  return (
    <div className="mx-auto max-w-3xl px-4 pb-40 md:pb-28">
      <SetlistHeader
        setlistId={setlist.id}
        name={setlist.name}
        scheduledFor={setlist.scheduled_for}
        isTemplate={setlist.is_template}
      />

      <section className="mt-4 space-y-2">
        {items.length === 0 ? (
          <p className="rounded-lg border border-white/10 bg-bg-surface px-4 py-8 text-center text-sm text-white/50">
            まだ曲がありません。下の「曲を追加」から追加してください。
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="space-y-2">
                {items.map((item, idx) => (
                  <SortableSetlistItem
                    key={item.id}
                    item={item}
                    order={idx + 1}
                    onDelete={handleDelete}
                    disabled={isPending}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}

        {error && (
          <p className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </p>
        )}
      </section>

      <section className="mt-4 space-y-2">
        <AddItemToSetlistButton
          setlistId={setlist.id}
          repertoire={repertoire}
          alreadyInSetlist={alreadyInSetlist}
        />
        <RandomFillButton setlistId={setlist.id} />
      </section>

      <BottomSummary items={items} />
    </div>
  );
}
