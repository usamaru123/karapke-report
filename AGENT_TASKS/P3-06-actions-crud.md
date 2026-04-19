---
id: P3-06
title: Server Actions (CRUD)
phase: 3
type: code
depends_on: [P3-01]
blocks: [P4-05, P4-07]
agent: generator
estimated_minutes: 20
---

# P3-06: Server Actions (CRUD)

## Goal
書き込み系の処理を Server Action として実装。`lib/actions/` 配下に機能別ファイルを分けて配置。

## Steps

### 1. `lib/actions/repertoire.ts`
```ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const AddSongSchema = z.object({
  songId: z.string().uuid().optional(),  // 既存曲から追加
  manualTitle: z.string().optional(),    // 手動追加時
  manualArtist: z.string().optional(),
  manualRequestNo: z.string().optional(),
})

export async function addToRepertoire(input: z.infer<typeof AddSongSchema>) {
  const data = AddSongSchema.parse(input)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  let songId = data.songId
  // 手動追加モード
  if (!songId && data.manualTitle && data.manualArtist) {
    const { data: newSong, error } = await supabase
      .from('songs')
      .upsert({
        title: data.manualTitle,
        artist: data.manualArtist,
        request_no: data.manualRequestNo,
      }, { onConflict: 'title_normalized,artist_normalized' })
      .select()
      .single()
    if (error) throw error
    songId = newSong.id
  }
  if (!songId) throw new Error('songId or manual info required')

  const { error: repErr } = await supabase
    .from('repertoire')
    .insert({ user_id: user.id, song_id: songId })
  if (repErr) {
    if (repErr.code === '23505') throw new Error('すでに登録済みです')
    throw repErr
  }
  revalidatePath('/repertoire')
}

export async function updateRepertoireMeta(repertoireId: string, patch: {
  preferred_key?: number
  confidence?: 'practicing' | 'normal' | 'confident'
  tags?: string[]
  memo?: string
  is_favorite?: boolean
}) {
  const supabase = await createClient()
  const { error } = await supabase.from('repertoire').update(patch).eq('id', repertoireId)
  if (error) throw error
  revalidatePath('/repertoire')
  revalidatePath(`/repertoire/${repertoireId}`)
}

export async function removeFromRepertoire(repertoireId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('repertoire').delete().eq('id', repertoireId)
  if (error) throw error
  revalidatePath('/repertoire')
}
```

### 2. `lib/actions/setlists.ts`
```ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createSetlist(input: { name: string; scheduledFor?: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data, error } = await supabase
    .from('setlists')
    .insert({ user_id: user.id, name: input.name, scheduled_for: input.scheduledFor })
    .select()
    .single()
  if (error) throw error
  revalidatePath('/setlists')
  return data
}

export async function addItemToSetlist(setlistId: string, songId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // 次の position を計算
  const { data: existing } = await supabase
    .from('setlist_items')
    .select('position')
    .eq('setlist_id', setlistId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextPos = existing ? existing.position + 1 : 0

  const { error } = await supabase.from('setlist_items').insert({
    setlist_id: setlistId,
    user_id: user.id,
    song_id: songId,
    position: nextPos,
  })
  if (error) throw error
  revalidatePath(`/setlists/${setlistId}`)
}

export async function reorderSetlistItems(setlistId: string, orderedItemIds: string[]) {
  const supabase = await createClient()
  // トランザクション的に: 全件の position を一度 巨大な値に逃がしてから再設定
  // (UNIQUE 制約 (setlist_id, position) を避けるため)

  // Supabase には本格的な transaction API がないので RPC 関数を schema に追加するのが理想
  // PoC 実装: 個別 update を順次実行 (一時 position でぶつからないよう巨大値に逃がす)
  const OFFSET = 1_000_000
  for (let i = 0; i < orderedItemIds.length; i++) {
    await supabase
      .from('setlist_items')
      .update({ position: OFFSET + i })
      .eq('id', orderedItemIds[i])
  }
  for (let i = 0; i < orderedItemIds.length; i++) {
    await supabase
      .from('setlist_items')
      .update({ position: i })
      .eq('id', orderedItemIds[i])
  }
  revalidatePath(`/setlists/${setlistId}`)
}

export async function deleteSetlistItem(itemId: string, setlistId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('setlist_items').delete().eq('id', itemId)
  if (error) throw error
  revalidatePath(`/setlists/${setlistId}`)
}
```

### 3. `lib/actions/sync.ts`
```ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function triggerSync() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase.functions.invoke('sync-scores', {
    body: { userId: user.id },
  })
  if (error) throw error

  revalidatePath('/')
  revalidatePath('/history')
  revalidatePath('/repertoire')
  return data as { fetched: number; new: number }
}
```

## Outputs
- `lib/actions/repertoire.ts`
- `lib/actions/setlists.ts`
- `lib/actions/sync.ts`

## Evaluation
```yaml
MUST:
  - [FILE] 3 ファイルすべて存在、冒頭に 'use server'
  - [CMD] pnpm type-check 通過
  - [CMD] 各関数が正常に呼び出せる (RLS 含めた実行テスト)
```

## Failure Modes
- **reorderSetlistItems が遅い**: N 回の UPDATE になっているので、将来は PostgreSQL RPC 関数として schema.sql に追加し、単一トランザクションで実行推奨
- **`'use server'` が効かない**: ファイル冒頭に配置、export 関数のみ使用可
