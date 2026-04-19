---
id: P4-03
title: 画面1 ダッシュボード
phase: 4
type: code
depends_on: [P3-03]
blocks: []
agent: generator
estimated_minutes: 45
claude_design_handoff: recommended
---

# P4-03: 画面1 ダッシュボード

## Goal
`/` ルートを実装。アプリを開いて最初に見る画面。

## Inputs
- `docs/karaoke-app-design-spec.md` の画面1 定義
- `prototypes/02-dashboard.png`
- `lib/queries/dashboard.ts`
- `lib/actions/sync.ts`

## Steps
1. `app/(app)/page.tsx` (Server Component):
   ```tsx
   import { getDashboardSummary, getHeroBest, getRecentScores } from '@/lib/queries/dashboard'
   import { HeroCard } from '@/components/features/dashboard/HeroCard'
   import { KpiGrid } from '@/components/features/dashboard/KpiGrid'
   import { RecentScoreList } from '@/components/features/dashboard/RecentScoreList'
   import { SyncCard } from '@/components/features/dashboard/SyncCard'

   export default async function DashboardPage() {
     const [summary, hero, recent] = await Promise.all([
       getDashboardSummary(),
       getHeroBest(),
       getRecentScores(5),
     ])

     return (
       <div className="pb-24 md:pb-0 space-y-6 p-4">
         <DashboardHeader />
         <HeroCard hero={hero} />
         <KpiGrid summary={summary} />
         <RecentScoreList scores={recent} />
         <SyncCard lastSyncAt={summary.lastSyncAt} />
       </div>
     )
   }
   ```

2. コンポーネント群:
   - `DashboardHeader` - 「お帰りなさい、<name>さん」「前回の歌唱: <date> (<N日前>)」
   - `HeroCard` - 今月ベストスコア、ネオンピンクglow、「自己ベスト更新」条件付きバッジ
   - `KpiGrid` - 2×2 タイル (レパ数/総歌唱/平均点/90+達成曲)、各タイル Link で対応画面に遷移
   - `RecentScoreList` - 直近5件、「すべて見る →」リンク
   - `SyncCard` (Client) - 取り込みボタン、useTransition + triggerSync

3. SyncCard の実装ポイント:
   ```tsx
   'use client'
   import { useTransition } from 'react'
   import { triggerSync } from '@/lib/actions/sync'
   import { toast } from 'sonner'

   export function SyncCard({ lastSyncAt }: { lastSyncAt: string | null }) {
     const [isPending, startTransition] = useTransition()
     return (
       <div className="bg-bg-surface border border-white/10 rounded-xl p-4">
         <div className="text-sm text-white/60">最終取込: {lastSyncAt ?? '未実行'}</div>
         <button
           disabled={isPending}
           className="mt-2 px-4 py-2 rounded bg-neon-cyan/20 border border-neon-cyan text-neon-cyan"
           onClick={() => startTransition(async () => {
             try {
               const result = await triggerSync()
               toast.success(`取り込み完了: 新規 ${result.new} 件`)
             } catch (e) {
               toast.error('取り込み失敗')
             }
           })}
         >
           {isPending ? '取り込み中...' : '取り込む'}
         </button>
       </div>
     )
   }
   ```

4. `app/layout.tsx` のルートレイアウトに `<Toaster />` を追加:
   ```tsx
   import { Toaster } from 'sonner'
   // ...
   <body>
     {children}
     <Toaster richColors theme="dark" />
   </body>
   ```

## Outputs
- `app/(app)/page.tsx`
- 上記コンポーネント群

## Evaluation
EVALUATION.md P4-03。主要チェック:
```yaml
MUST:
  - [HTTP] / が 200
  - [CMD] ヒーローカードに実データ反映
  - [CMD] KPI タイルクリックで対応画面に遷移
  - [CMD] 「取り込む」ボタンで sync-scores Edge Function が呼ばれる
SHOULD:
  - [VISUAL] 自己ベスト更新バッジが条件付き表示
```

## Failure Modes
- **最終取込日時が NULL**: 初回起動時は未実行なので「未取込」表示にフォールバック
- **triggerSync が失敗**: Edge Function が未デプロイ (P5-01) の場合、fallback として PoC Python を呼ぶかエラー表示
