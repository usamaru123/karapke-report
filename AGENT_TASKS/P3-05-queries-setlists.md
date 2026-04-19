---
id: P3-05
title: Queries - Setlists
phase: 3
type: code
depends_on: [P3-01]
blocks: [P4-06, P4-07]
agent: generator
estimated_minutes: 15
---

# P3-05: Queries - Setlists

## Goal
セトリ画面用の `lib/queries/setlists.ts` を実装。

## Steps
```ts
import { createClient } from '@/lib/supabase/server'

export async function getSetlists() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('setlists')
    .select(`
      *,
      items:setlist_items(
        id, position, key_override,
        song:songs(id, title, artist, duration_sec)
      )
    `)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error

  // 各セトリの items を position 順にソート
  return (data ?? []).map(setlist => ({
    ...setlist,
    items: (setlist.items ?? []).sort((a, b) => a.position - b.position),
    totalDurationSec: (setlist.items ?? []).reduce(
      (sum, it) => sum + (it.song?.duration_sec ?? 240), 0
    ),  // duration_sec 未設定の曲は 4 分と仮定
  }))
}

export async function getSetlistDetail(setlistId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('setlists')
    .select(`
      *,
      items:setlist_items(
        id, position, key_override, note,
        song:songs(*)
      )
    `)
    .eq('id', setlistId)
    .single()

  if (error) throw error
  return {
    ...data,
    items: (data.items ?? []).sort((a, b) => a.position - b.position),
  }
}
```

## Outputs
- `lib/queries/setlists.ts`

## Evaluation
- 2 関数 export
- pnpm type-check 通過
