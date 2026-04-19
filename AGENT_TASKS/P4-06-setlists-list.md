---
id: P4-06
title: 画面8 セットリスト一覧
phase: 4
type: code
depends_on: [P3-05]
blocks: [P4-07]
agent: generator
estimated_minutes: 30
claude_design_handoff: optional
---

# P4-06: 画面8 セットリスト一覧

## Goal
`/setlists` ルートを実装。ピン留め中のセトリと保存済みセトリを並列表示。

## Steps

1. `app/(app)/setlists/page.tsx`:
   ```tsx
   import { getSetlists } from '@/lib/queries/setlists'
   import { SetlistCard } from '@/components/features/setlist/SetlistCard'
   import Link from 'next/link'

   export default async function SetlistsPage() {
     const setlists = await getSetlists()
     const pinned = setlists.filter(s => s.is_pinned)
     const saved  = setlists.filter(s => !s.is_pinned)

     return (
       <div className="pb-24 md:pb-0 space-y-6 p-4">
         <header className="flex justify-between items-center">
           <h1 className="text-xl font-bold">セットリスト</h1>
           <Link href="/setlists/new" className="... bg-neon-cyan/20 ...">+ 新規</Link>
         </header>

         {pinned.length > 0 && (
           <section>
             <h2 className="text-sm text-white/60 mb-2">📌 次回用</h2>
             <div className="space-y-2">
               {pinned.map(s => <SetlistCard key={s.id} setlist={s} />)}
             </div>
           </section>
         )}

         {saved.length > 0 && (
           <section>
             <h2 className="text-sm text-white/60 mb-2">保存済み</h2>
             <div className="space-y-2">
               {saved.map(s => <SetlistCard key={s.id} setlist={s} />)}
             </div>
           </section>
         )}

         {setlists.length === 0 && (
           <EmptyState />
         )}
       </div>
     )
   }
   ```

2. `SetlistCard`:
   - セトリ名、曲数、予想時間、先頭3曲のサムネイル風バッジ
   - クリックで `/setlists/[id]` へ遷移
   - ピン留めトグル (Client Component + Server Action)

3. `/setlists/new` ページ:
   - セトリ名を入力 → `createSetlist` Action → 作成後 `/setlists/[id]` にリダイレクト

## Outputs
- `app/(app)/setlists/page.tsx`
- `app/(app)/setlists/new/page.tsx`
- `components/features/setlist/SetlistCard.tsx`
- `components/features/setlist/EmptyState.tsx`

## Evaluation
EVALUATION.md P4-06:
```yaml
MUST:
  - [HTTP] /setlists が 200
  - [CMD] セトリ作成・一覧表示が動作
  - [CMD] ピン留めがピンセクションに表示
```
