---
id: P3-04
title: Queries - History
phase: 3
type: code
depends_on: [P3-01]
blocks: [P4-04]
agent: generator
estimated_minutes: 15
---

# P3-04: Queries - History

## Goal
採点履歴画面用の `lib/queries/history.ts` を実装。セッション単位でグルーピング済みの形で返す。

## Steps
```ts
import { createClient } from '@/lib/supabase/server'

export type PeriodFilter = 'this_month' | 'this_year' | 'all'

export async function getHistoryWithSessions(opts?: { period?: PeriodFilter }) {
  const supabase = await createClient()

  let fromDate: string | null = null
  const now = new Date()
  if (opts?.period === 'this_month') {
    fromDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  } else if (opts?.period === 'this_year') {
    fromDate = new Date(now.getFullYear(), 0, 1).toISOString()
  }

  // sessions + 配下の scores を時系列降順で取得
  let query = supabase
    .from('sessions')
    .select(`
      *,
      scores:scores(
        id, sung_at, total_score, key_control,
        song:songs(id, title, artist)
      )
    `)
    .order('started_at', { ascending: false })

  if (fromDate) {
    query = query.gte('started_at', fromDate)
  }

  const { data, error } = await query
  if (error) throw error

  // 各セッション内の scores を時刻順にソート
  return (data ?? []).map(session => ({
    ...session,
    scores: (session.scores ?? []).sort((a, b) =>
      a.sung_at.localeCompare(b.sung_at)
    ),
  }))
}

export async function getScoresForSong(songId: string, limit = 10) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('scores')
    .select('*')
    .eq('song_id', songId)
    .order('sung_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}
```

## Outputs
- `lib/queries/history.ts`

## Evaluation
- 2 関数 export
- pnpm type-check 通過

## Failure Modes
- Supabase の nested select で `scores:scores(...)` を使うときに外側の sessions に scores が属することを RLS が認識するか確認
