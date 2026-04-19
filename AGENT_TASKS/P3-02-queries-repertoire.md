---
id: P3-02
title: Queries - Repertoire
phase: 3
type: code
depends_on: [P3-01]
blocks: [P4-01, P4-02]
agent: generator
estimated_minutes: 20
---

# P3-02: Queries - Repertoire

## Goal
レパートリー画面で使うデータ取得関数を `lib/queries/repertoire.ts` に実装する。

## Inputs
- `docs/data-model.md` の「主要ユースケースごとのクエリ例」
- `types/database.ts`, `types/domain.ts`

## Steps
1. `karaoke-app/lib/queries/repertoire.ts` を作成:

   ```ts
   import { createClient } from '@/lib/supabase/server'
   import type { Repertoire, Song, Score } from '@/types/domain'

   export type RepertoireFilter = 'all' | 'over90' | 'recent' | 'favorite'
   export type RepertoireSort = 'best_score' | 'recent' | 'title' | 'added'

   export type RepertoireWithMeta = Repertoire & {
     song: Song
     best_score: number | null
     last_sung_at: string | null
   }

   export async function getRepertoire(opts?: {
     filter?: RepertoireFilter
     sort?: RepertoireSort
     search?: string
   }): Promise<RepertoireWithMeta[]> {
     const supabase = await createClient()
     // RLS により自分のデータのみ返る
     let query = supabase
       .from('repertoire')
       .select(`
         *,
         song:songs(*),
         scores:scores(total_score, sung_at)
       `)

     if (opts?.filter === 'favorite') {
       query = query.eq('is_favorite', true)
     }

     const { data, error } = await query
     if (error) throw error

     // best_score, last_sung_at を集計
     const enriched: RepertoireWithMeta[] = (data ?? []).map(row => {
       const scores = (row.scores ?? []) as Pick<Score, 'total_score' | 'sung_at'>[]
       const best = scores.length ? Math.max(...scores.map(s => Number(s.total_score))) : null
       const last = scores.length ? scores.map(s => s.sung_at).sort().reverse()[0] : null
       return { ...row, best_score: best, last_sung_at: last } as RepertoireWithMeta
     })

     // filter: over90 / recent
     let filtered = enriched
     if (opts?.filter === 'over90') {
       filtered = enriched.filter(r => (r.best_score ?? 0) >= 90)
     } else if (opts?.filter === 'recent') {
       // 30日以上歌ってない曲
       const threshold = new Date(Date.now() - 30 * 86400 * 1000).toISOString()
       filtered = enriched.filter(r => !r.last_sung_at || r.last_sung_at < threshold)
     }

     // search
     if (opts?.search) {
       const q = opts.search.toLowerCase()
       filtered = filtered.filter(r =>
         r.song.title.toLowerCase().includes(q) ||
         r.song.artist.toLowerCase().includes(q)
       )
     }

     // sort
     switch (opts?.sort ?? 'best_score') {
       case 'best_score':
         filtered.sort((a, b) => (b.best_score ?? 0) - (a.best_score ?? 0))
         break
       case 'recent':
         filtered.sort((a, b) => (b.last_sung_at ?? '').localeCompare(a.last_sung_at ?? ''))
         break
       case 'title':
         filtered.sort((a, b) => a.song.title.localeCompare(b.song.title, 'ja'))
         break
       case 'added':
         filtered.sort((a, b) => b.added_at.localeCompare(a.added_at))
         break
     }

     return filtered
   }

   export async function getRepertoireDetail(repertoireId: string) {
     const supabase = await createClient()
     const { data: rep, error: repErr } = await supabase
       .from('repertoire')
       .select(`*, song:songs(*)`)
       .eq('id', repertoireId)
       .single()
     if (repErr) throw repErr

     const { data: scores, error: scoreErr } = await supabase
       .from('scores')
       .select('*')
       .eq('song_id', rep.song.id)
       .order('sung_at', { ascending: false })
     if (scoreErr) throw scoreErr

     const best = scores.length ? Math.max(...scores.map(s => Number(s.total_score))) : null
     const avg = scores.length ? scores.reduce((a, s) => a + Number(s.total_score), 0) / scores.length : null
     const latest = scores[0] ?? null

     return {
       repertoire: rep,
       song: rep.song,
       scores,
       stats: { best, avg, latestScore: latest?.total_score ?? null },
     }
   }
   ```

## Outputs
- `lib/queries/repertoire.ts`

## Evaluation
```yaml
MUST:
  - [FILE] 2 関数が export されている: getRepertoire, getRepertoireDetail
  - [CMD] pnpm type-check 終了コード 0
  - [CMD] Server Component から getRepertoire() を呼び出して正常にデータが返る
```

## Failure Modes
- **Supabase の JOIN 記法エラー**: `scores:scores(...)` の構文を確認
- **型エラー**: types/database.ts を再生成
- **件数が多すぎて遅い**: 後から pagination を足す (MVP では無視して OK)
