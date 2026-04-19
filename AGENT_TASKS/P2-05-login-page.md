---
id: P2-05
title: ログイン画面
phase: 2
type: code
depends_on: [P2-04]
blocks: []
agent: generator
estimated_minutes: 15
---

# P2-05: ログイン画面

## Goal
Email + Password でログインできる画面と、Server Action を実装する。

## Steps
1. `karaoke-app/app/(auth)/login/page.tsx`:
   - Email / Password の入力フォーム
   - "Sign in" ボタン
   - ダークテーマ、仕様書のカラーパレット適用
   - Server Action でログイン処理

2. `karaoke-app/app/(auth)/login/actions.ts`:
   ```ts
   'use server'
   import { createClient } from '@/lib/supabase/server'
   import { redirect } from 'next/navigation'

   export async function signIn(formData: FormData) {
     const supabase = await createClient()
     const email = formData.get('email') as string
     const password = formData.get('password') as string
     const { error } = await supabase.auth.signInWithPassword({ email, password })
     if (error) {
       return { error: error.message }
     }
     redirect('/')
   }
   ```

3. デザイン指針:
   - 中央配置の小カード (w-80)
   - bg-bg-surface + border + 角丸
   - ヘッダーに「カラオケレパ」等のアプリタイトル
   - エラーメッセージは赤系、上部に表示

## Outputs
- `app/(auth)/login/page.tsx`
- `app/(auth)/login/actions.ts`

## Evaluation
```yaml
MUST:
  - [HTTP] /login が 200
  - [VISUAL] フォームが中央配置、ダーク背景
  - [CMD] ログイン成功で / にリダイレクト
  - [CMD] ログイン失敗でエラーメッセージ表示
```

## Failure Modes
- **ログインできるがリダイレクトされない**: Server Action 内の redirect() を throw の外で呼んでいない
- **ログイン後 / に行くが即 /login に戻される**: middleware のセッション判定が効いていない → updateSession の実装確認
