---
id: P3-03
title: Queries - Dashboard
phase: 3
type: code
depends_on: [P3-01]
blocks: [P4-03]
agent: generator
estimated_minutes: 15
---

# P3-03: Queries - Dashboard

## Goal
`lib/queries/dashboard.ts` にダッシュボード画面で使う KPI 集計関数群を実装。

## Steps
以下を実装:

```ts
import { createClient } from '@/lib/supabase/server'

export async function getDashboardSummary() {
  const supabase = await createClient()

  // 並列実行
  const [repCount, scoreCount, avgScore, highScoreCount, lastSyncAt] = await Promise.all([
    supabase.from('repertoire').select('*', { count: 'exact', head: true }),
    supabase.from('scores').select('*', { count: 'exact', head: true }),
    supabase.from('scores').select('total_score'),
    supabase.from('scores').select('song_id').gte('total_score', 90),
    supabase.from('sync_logs').select('finished_at').order('finished_at', { ascending: false }).limit(1).single(),
  ])

  const avg = avgScore.data?.length
    ? avgScore.data.reduce((a, s) => a + Number(s.total_score), 0) / avgScore.data.length
    : null

  // 90+を達成した曲 (重複排除)
  const uniqueHighSongs = new Set(highScoreCount.data?.map(s => s.song_id) ?? []).size

  return {
    repertoireCount: repCount.count ?? 0,
    totalScoreCount: scoreCount.count ?? 0,
    averageScore: avg,
    highScoreSongCount: uniqueHighSongs,
    lastSyncAt: lastSyncAt.data?.finished_at ?? null,
  }
}

export async function getHeroBest() {
  const supabase = await createClient()
  // 今月の最高点
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const { data } = await supabase
    .from('scores')
    .select('total_score, sung_at, song:songs(title, artist)')
    .gte('sung_at', firstOfMonth)
    .order('total_score', { ascending: false })
    .limit(1)
    .maybeSingle()

  // 先月以前のベストと比較
  const { data: prevBest } = await supabase
    .from('scores')
    .select('total_score')
    .lt('sung_at', firstOfMonth)
    .order('total_score', { ascending: false })
    .limit(1)
    .maybeSingle()

  return {
    current: data,
    isBestUpdated: data && prevBest ? Number(data.total_score) > Number(prevBest.total_score) : false,
  }
}

export async function getRecentScores(limit = 5) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('scores')
    .select('id, total_score, sung_at, song:songs(title, artist)')
    .order('sung_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}
```

## Outputs
- `lib/queries/dashboard.ts`

## Evaluation
- 3 関数が export されている
- pnpm type-check 通過
- Server Component から呼び出せる

## Failure Modes
- `count: 'exact', head: true` で count を取る場合、Supabase の設定で有効化が必要
