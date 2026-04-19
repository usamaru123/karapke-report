---
id: P4-04
title: 画面5 採点履歴一覧
phase: 4
type: code
depends_on: [P3-04]
blocks: []
agent: generator
estimated_minutes: 30
claude_design_handoff: optional
---

# P4-04: 画面5 採点履歴一覧

## Goal
`/history` ルートを実装。全歌唱履歴を時系列で、セッション単位でグルーピングして表示。

## Steps
1. `app/(app)/history/page.tsx`:
   ```tsx
   import { getHistoryWithSessions } from '@/lib/queries/history'
   import { PeriodTabs } from '@/components/features/history/PeriodTabs'
   import { SessionGroup } from '@/components/features/history/SessionGroup'

   export default async function HistoryPage({
     searchParams,
   }: { searchParams: Promise<{ period?: string }> }) {
     const params = await searchParams
     const period = (params.period as any) ?? 'this_month'
     const sessions = await getHistoryWithSessions({ period })
     const totalCount = sessions.reduce((acc, s) => acc + (s.scores?.length ?? 0), 0)

     return (
       <div className="pb-24 md:pb-0">
         <header className="sticky top-0 bg-bg-base/90 backdrop-blur border-b border-white/10 px-4 py-3">
           <h1 className="text-xl font-bold">採点履歴 ({totalCount})</h1>
         </header>
         <PeriodTabs active={period} />
         <div className="divide-y divide-white/5">
           {sessions.map(session => (
             <SessionGroup key={session.id} session={session} />
           ))}
         </div>
         <InfoBanner />
       </div>
     )
   }
   ```

2. コンポーネント:
   - `PeriodTabs` (Client) - 今月/今年/全期間/カスタム、URL searchParams 更新
   - `SessionGroup` (Server) - セッション見出し + 曲行リスト
   - `SessionHeader` - 「4月18日 (金) · 8曲歌唱」
   - `ScoreRow` - 時刻 + 曲名 + アーティスト + 点数 + KEY
   - `InfoBanner` - 200件上限説明

3. セッションヘッダーのフォーマット:
   ```ts
   import { format } from 'date-fns'
   import { ja } from 'date-fns/locale'
   // "4月18日 (金)"
   format(new Date(session.started_at), 'M月d日 (E)', { locale: ja })
   ```

## Outputs
- `app/(app)/history/page.tsx`
- 関連コンポーネント

## Evaluation
EVALUATION.md P4-04:
```yaml
MUST:
  - [HTTP] /history が 200
  - [CMD] 同じ日の連続歌唱が 1 セッションにグルーピング
  - [CMD] セッション見出しに 日付 + 曜日 + 曲数
  - [CMD] 点数の色分けが他画面と一致
```

## Failure Modes
- **セッションが期待通りグルーピングされない**: PoC で session_id が正しく割り振られているか確認
- **日本語ロケールが効かない**: date-fns/locale/ja を明示的に import
