---
id: P4-05
title: 画面4 曲追加モーダル
phase: 4
type: code
depends_on: [P3-06, P4-01]
blocks: []
agent: generator
estimated_minutes: 30
claude_design_handoff: optional
---

# P4-05: 画面4 曲追加モーダル

## Goal
レパ一覧の FAB から開くボトムシート型の曲追加モーダル。「採点履歴から」と「手動で追加」のタブを持つ。

## Steps

1. `components/features/repertoire/AddSongModal.tsx` (Client):
   ```tsx
   'use client'
   import { useState } from 'react'
   import { Dialog, DialogContent } from '@/components/ui/BottomSheet'  // 自作か shadcn/ui
   // ...

   export function AddSongModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
     const [tab, setTab] = useState<'history' | 'manual'>('history')
     return (
       <Dialog open={open} onOpenChange={onOpenChange}>
         <DialogContent className="bg-bg-elevated">
           <h2 className="text-lg font-bold">曲を追加</h2>
           <TabSwitcher value={tab} onChange={setTab} />
           {tab === 'history' ? <AddFromHistory /> : <ManualAddForm />}
         </DialogContent>
       </Dialog>
     )
   }
   ```

2. 「採点履歴から追加」タブ:
   - `lib/queries/repertoire.ts` に `getUnadoptedSongsFromScores()` を追加:
     ```ts
     // 歌ったことはあるがレパに未登録の曲リスト
     export async function getUnadoptedSongsFromScores() {
       const supabase = await createClient()
       const { data, error } = await supabase.rpc('get_unadopted_songs')
       // もしくは JOIN で NOT IN 条件
       // ...
     }
     ```
   - 結果をリスト表示、各行に「+追加」ボタン
   - クリックで `addToRepertoire({ songId })` Action 実行

3. 「手動で追加」タブ:
   - react-hook-form + zod で form 実装
   - フィールド: 曲名 (必須) / アーティスト (必須) / 配信番号 / キー / タグ
   - 送信で `addToRepertoire({ manualTitle, manualArtist, ...})` Action 実行

4. エラー時:
   - すでに登録済み → 「すでに登録済みです」トースト
   - その他 → 「追加に失敗しました」トースト

## Outputs
- `components/features/repertoire/AddSongModal.tsx`
- `components/features/repertoire/AddFromHistory.tsx`
- `components/features/repertoire/ManualAddForm.tsx`
- `components/ui/BottomSheet.tsx` (カスタムモーダル)

## Evaluation
EVALUATION.md P4-05:
```yaml
MUST:
  - [CMD] FAB クリックでモーダル開く
  - [CMD] タブ切替動作
  - [CMD] 手動追加で repertoire に INSERT される
  - [CMD] 重複追加時にユーザーフレンドリーなエラー
```

## Failure Modes
- **Dialog が scroll をブロックしない**: 適切な overlay と trap-focus が必要
- **Server Action の throw が client で catch できない**: try/catch で error オブジェクトを返す形に
