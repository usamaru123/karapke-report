---
id: P4-07
title: 画面9 セットリスト編集
phase: 4
type: code
depends_on: [P3-05, P3-06, P4-06]
blocks: []
agent: generator
estimated_minutes: 45
claude_design_handoff: optional
---

# P4-07: 画面9 セットリスト編集

## Goal
`/setlists/[id]` ルートを実装。DnD で曲順を並べ替え、曲追加・削除可能。

## Steps

1. `app/(app)/setlists/[id]/page.tsx` (Server Component でデータ取得):
   ```tsx
   import { getSetlistDetail } from '@/lib/queries/setlists'
   import { notFound } from 'next/navigation'
   import { SetlistEditor } from '@/components/features/setlist/SetlistEditor'

   export default async function SetlistDetailPage({
     params,
   }: { params: Promise<{ id: string }> }) {
     const { id } = await params
     try {
       const setlist = await getSetlistDetail(id)
       return <SetlistEditor setlist={setlist} />
     } catch {
       notFound()
     }
   }
   ```

2. `SetlistEditor` (Client Component) - DnD 本体:
   ```tsx
   'use client'
   import { DndContext, closestCenter } from '@dnd-kit/core'
   import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
   import { reorderSetlistItems, deleteSetlistItem } from '@/lib/actions/setlists'
   import { useState, useTransition } from 'react'

   export function SetlistEditor({ setlist }: { setlist: SetlistDetail }) {
     const [items, setItems] = useState(setlist.items)
     const [isPending, startTransition] = useTransition()

     const handleDragEnd = (event: any) => {
       const { active, over } = event
       if (!over || active.id === over.id) return
       const oldIndex = items.findIndex(i => i.id === active.id)
       const newIndex = items.findIndex(i => i.id === over.id)
       const newItems = arrayMove(items, oldIndex, newIndex)
       setItems(newItems)  // optimistic update
       startTransition(() => {
         reorderSetlistItems(setlist.id, newItems.map(i => i.id))
       })
     }

     return (
       <div className="pb-24 md:pb-0 p-4 space-y-4">
         <SetlistHeader setlist={setlist} />
         <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
           <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
             <ul className="space-y-2">
               {items.map(item => (
                 <SortableSetlistItem
                   key={item.id}
                   item={item}
                   onDelete={() => {
                     setItems(items.filter(i => i.id !== item.id))
                     startTransition(() => deleteSetlistItem(item.id, setlist.id))
                   }}
                 />
               ))}
             </ul>
           </SortableContext>
         </DndContext>
         <AddItemButton setlistId={setlist.id} />
         <BottomSummary items={items} />
       </div>
     )
   }
   ```

3. 追加の UI 要素:
   - ≡ ドラッグハンドル (`useSortable` の listeners を適用)
   - スワイプ削除もしくは 削除ボタン
   - 画面下部に固定の集計バー (曲数 + 予想時間)

4. 曲追加モーダルは `AddSongModal` を流用 (P4-05 で作ったもの) だが、今回は repertoire に追加するのではなく setlist_items に追加する別 Action が必要:
   - `lib/actions/setlists.ts` の `addItemToSetlist` を呼ぶ

## Outputs
- `app/(app)/setlists/[id]/page.tsx`
- `components/features/setlist/SetlistEditor.tsx`
- `components/features/setlist/SortableSetlistItem.tsx`
- `components/features/setlist/SetlistHeader.tsx`
- `components/features/setlist/AddItemButton.tsx`
- `components/features/setlist/BottomSummary.tsx`

## Evaluation
EVALUATION.md P4-07:
```yaml
MUST:
  - [HTTP] /setlists/<実在ID> が 200
  - [CMD] DnD で並べ替えができる
  - [CMD] 並べ替え後、setlist_items.position が UNIQUE 制約を満たす
  - [CMD] 曲追加・削除が動作
```

## Failure Modes
- **DnD の position 更新で UNIQUE 違反**: reorderSetlistItems の 2 段階 UPDATE (OFFSET 退避) が正しく動いていない
- **Optimistic UI と Server 結果がずれる**: revalidatePath を確実に実行、Server Component の再取得で同期
- **モバイルで DnD が動かない**: @dnd-kit/core に TouchSensor を明示的に追加

## Escalation
- DnD が不安定で UNIQUE 制約違反を頻発 → RPC 関数を schema に追加し、単一トランザクション化を検討 (人間判断)
