---
id: P5-02
title: Vault 連携
phase: 5
type: code
depends_on: [P5-01]
blocks: [P5-03]
agent: generator
estimated_minutes: 20
---

# P5-02: Vault 連携

## Goal
ユーザーが cdmCardNo を UI から登録でき、Edge Function が Vault から復号して使える状態にする。

## Steps

### 1. 設定画面にフォーム追加
`app/(app)/settings/page.tsx`:
```tsx
import { createClient } from '@/lib/supabase/server'
import { CardNoForm } from '@/components/features/settings/CardNoForm'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('cdm_card_no_vault_id')
    .single()

  const hasCardNo = !!profile?.cdm_card_no_vault_id

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-bold">設定</h1>
      <section>
        <h2>DAM カード番号</h2>
        <p className="text-sm text-white/60">
          {hasCardNo ? '登録済み (暗号化保存)' : '未登録'}
        </p>
        <CardNoForm hasCardNo={hasCardNo} />
      </section>
    </div>
  )
}
```

### 2. Server Action
`lib/actions/profile.ts`:
```ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function setCdmCardNo(cardNo: string) {
  const supabase = await createClient()
  // RPC 経由で Vault に登録
  const { data, error } = await supabase.rpc('set_my_cdm_card_no', {
    p_card_no: cardNo.trim(),
  })
  if (error) throw error
  revalidatePath('/settings')
  return { success: true }
}
```

### 3. フォームコンポーネント
`components/features/settings/CardNoForm.tsx` (Client):
```tsx
'use client'
import { useState, useTransition } from 'react'
import { setCdmCardNo } from '@/lib/actions/profile'
import { toast } from 'sonner'

export function CardNoForm({ hasCardNo }: { hasCardNo: boolean }) {
  const [value, setValue] = useState('')
  const [isPending, startTransition] = useTransition()

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        startTransition(async () => {
          try {
            await setCdmCardNo(value)
            toast.success('登録しました')
            setValue('')
          } catch (e: any) {
            toast.error('登録失敗: ' + e.message)
          }
        })
      }}
      className="flex gap-2"
    >
      <input
        type="password"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={hasCardNo ? '新しい番号で上書き' : 'DAM カード番号'}
        className="flex-1 px-3 py-2 bg-bg-surface border border-white/10 rounded"
      />
      <button
        type="submit"
        disabled={isPending || !value}
        className="px-4 py-2 bg-neon-cyan/20 border border-neon-cyan text-neon-cyan rounded"
      >
        {hasCardNo ? '更新' : '登録'}
      </button>
    </form>
  )
}
```

### 4. Edge Function 側からの Vault アクセス確認
```bash
# 手動テスト
curl -X POST "$SUPABASE_URL/functions/v1/sync-scores" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json"
```

## Outputs
- `app/(app)/settings/page.tsx`
- `lib/actions/profile.ts`
- `components/features/settings/CardNoForm.tsx`

## Evaluation
EVALUATION.md P5-02:
```yaml
MUST:
  - [CMD] set_my_cdm_card_no RPC 呼び出しが成功
  - [DB] profiles.cdm_card_no_vault_id が非 NULL
  - [CMD] Edge Function 実行時に Vault 復号が成功
  - [CMD] anon ロールで get_cdm_card_no_for を呼ぶと権限エラー
```

## Failure Modes
- **Vault 拡張が無効**: P1-01 で確認必須
- **RPC 権限エラー**: SECURITY DEFINER の search_path が正しいか確認
