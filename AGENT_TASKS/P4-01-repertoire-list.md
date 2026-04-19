---
id: P4-01
title: 画面2 レパートリー一覧
phase: 4
type: code
depends_on: [P3-02, P2-06]
blocks: [P4-02, P4-05]
agent: generator
estimated_minutes: 45
claude_design_handoff: recommended
---

# P4-01: 画面2 レパートリー一覧

## Goal
`/repertoire` ルートを実装。アプリの顔となる画面。

## Inputs
- `docs/karaoke-app-design-spec.md` の画面2 定義
- `prototypes/01-repertoire-list.png` (Claude Design 出力)
- `lib/queries/repertoire.ts` (getRepertoire)
- `docs/claude-design-integration.md`

## Steps

### Option A: Claude Design Hand off を使う場合
Claude Design から「Repertoire List (Mobile).html」の Hand off URL を取得し、以下のプロンプトで渡す:
```
Fetch this design file, read its readme, and implement the relevant aspects of the design.
[URL]
Implement: Repertoire List (Mobile).html

Additional context:
- This is a Next.js 15 App Router project
- Use Server Component as the base, split interactive parts into Client Components
- Data source: lib/queries/repertoire.ts → getRepertoire()
- Filter state via URL searchParams (?filter=over90)
- Use existing Tailwind tokens (neon-pink, bg-surface, etc.)
- Ensure responsive: mobile-first, PC shows sidebar nav (already in layout)
```

### Option B: 手動実装
1. `app/(app)/repertoire/page.tsx` (Server Component):
   ```tsx
   import { getRepertoire } from '@/lib/queries/repertoire'
   import { RepertoireHeader } from '@/components/features/repertoire/RepertoireHeader'
   import { FilterChips } from '@/components/features/repertoire/FilterChips'
   import { RepertoireList } from '@/components/features/repertoire/RepertoireList'
   import { AddSongFab } from '@/components/features/repertoire/AddSongFab'

   export default async function RepertoirePage({
     searchParams,
   }: {
     searchParams: Promise<{ filter?: string; sort?: string; q?: string }>
   }) {
     const params = await searchParams
     const items = await getRepertoire({
       filter: params.filter as any,
       sort: params.sort as any,
       search: params.q,
     })

     return (
       <div className="pb-24 md:pb-0">
         <RepertoireHeader totalCount={items.length} />
         <FilterChips active={params.filter ?? 'all'} />
         <div className="px-4 py-2 text-sm text-white/60">
           並び替え: 最高点順
         </div>
         <RepertoireList items={items} />
         <AddSongFab />
       </div>
     )
   }
   ```

2. 以下のコンポーネントを作成:
   - `components/features/repertoire/RepertoireHeader.tsx` - タイトル + 検索アイコン + フィルタアイコン
   - `components/features/repertoire/FilterChips.tsx` (Client) - すべて/90+/最近歌ってない/十八番/盛り上げ/バラード、クリックで URL 更新
   - `components/features/repertoire/RepertoireList.tsx` - 曲カードのリスト
   - `components/features/repertoire/RepertoireCard.tsx` - 1曲分のカード
   - `components/features/repertoire/AddSongFab.tsx` (Client) - FAB、タップでモーダル開く (モーダル本体は P4-05)
   - `components/ui/ScoreBadge.tsx` - 点数表示、色分けロジック
   - `components/ui/KeyBadge.tsx` - KEY 表示
   - `components/ui/ConfidenceStars.tsx` - ★★☆ 表示

### デザイン準拠のキーポイント
- 点数 90+ は `text-neon-pink neon-text-pink` (glow 付き)
- 点数 80-90 は `text-white`
- 点数 <80 は `text-white/40`
- KEY バッジ: ±0 はグレー系、-1/-2 はシアン系
- タグチップ: 角丸、半透明背景
- 曲カード間の border: `border-white/10`
- FAB は `bg-gradient-to-br from-neon-pink to-neon-purple` 風

## Outputs
- `app/(app)/repertoire/page.tsx`
- 上記コンポーネント群

## Evaluation
EVALUATION.md の P4-01 節。主要チェック:
```yaml
MUST:
  - [HTTP] /repertoire が 200
  - [CMD] 90+ 点のスコアが neon-pink + glow 表示
  - [CMD] FAB が右下に表示
  - [CMD] ?filter=over90 で絞り込み動作
  - [CMD] pnpm build 通過
  - [CMD] モバイル/PC 両方でレイアウト崩れなし
SHOULD:
  - [VISUAL] Claude Design との pixel diff < 15%
```

## Failure Modes
- **Server Component で onClick が書けない**: FilterChips 等インタラクティブ要素は Client Component に分離
- **searchParams が undefined**: Next.js 15 では Promise なので await 必須
- **pixel diff 過大**: スペーシング・フォントサイズ・角丸半径を Claude Design 出力と合わせる

## Escalation
- 3 回の修正でも pixel diff が 30% を超える → 人間にデザイン判断を依頼
