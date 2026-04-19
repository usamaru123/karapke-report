---
id: P5-01
title: Edge Function 実装
phase: 5
type: code
depends_on: [P1-06]
blocks: [P5-02, P5-03]
agent: generator
estimated_minutes: 90
---

# P5-01: Edge Function 実装

## Goal
PoC の Python ロジックを Supabase Edge Function (Deno + TypeScript) に移植し、Supabase にデプロイする。

## Inputs
- `poc/karaoke-sync-poc/src/` 全体 (TypeScript 移植の元ネタ)
- `docs/data-model.md`

## Steps

### 1. Edge Function 初期化
```bash
cd karaoke-app
supabase functions new sync-scores
```

生成される `supabase/functions/sync-scores/index.ts` を編集。

### 2. ディレクトリ構成
```
supabase/functions/sync-scores/
├── index.ts              # エントリポイント
├── dam_client.ts         # PoC: src/dam_client.py の移植
├── parser.ts             # PoC: src/parser.py の移植
├── session_boundary.ts   # PoC: src/session_boundary.py の移植
├── db.ts                 # PoC: src/db.py の移植
└── sync.ts               # PoC: src/sync.py の移植
```

### 3. `index.ts` (エントリポイント)
```ts
import { serve } from 'https://deno.land/std/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { runSync } from './sync.ts'

serve(async (req) => {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  // 呼び出しユーザーを特定 (JWT から)
  const token = authHeader.replace('Bearer ', '')
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return new Response('Unauthorized', { status: 401 })

  // Vault から cdmCardNo を復号取得
  const { data: cardNo, error: vaultErr } = await supabase.rpc('get_cdm_card_no_for', {
    p_user_id: user.id,
  })
  if (vaultErr) return new Response('Vault error: ' + vaultErr.message, { status: 500 })

  try {
    const result = await runSync(supabase, user.id, cardNo)
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response('Sync failed: ' + error.message, { status: 500 })
  }
})
```

### 4. 他ファイルの移植
PoC の Python ロジックを TypeScript に機械的に変換:
- `httpx` → `fetch` (Deno 標準)
- `lxml` → `DOMParser` (Deno の XMLParser 代替: `@xml-js/parser` や `fast-xml-parser` の Deno 版)
- `pydantic` → zod で代替
- `supabase-py` → `@supabase/supabase-js`
- 構造化ログは `console.log(JSON.stringify({ level, msg, ...ctx }))` で代替

パースロジックの要点は変わらない。PoC の parser.py を逐行ポート。

### 5. デプロイ
```bash
supabase functions deploy sync-scores --no-verify-jwt=false
```

`--no-verify-jwt=false` で JWT 検証を Function 側でも行う (追加の安全策)。

### 6. 環境変数設定
Supabase Dashboard > Edge Functions > sync-scores > Settings で:
- `SUPABASE_URL` (自動設定済み)
- `SUPABASE_SERVICE_ROLE_KEY` (自動設定済み)

cdmCardNo は Vault 経由なので環境変数不要。

## Outputs
- `supabase/functions/sync-scores/` 一式
- デプロイ済みの Edge Function

## Evaluation
EVALUATION.md P5-01:
```yaml
MUST:
  - [CMD] supabase functions deploy sync-scores 終了コード 0
  - [HTTP] supabase functions invoke sync-scores が 200 を返す
  - [DB] 実行後、scores に新しいレコード追加 (変化あれば)
  - [DB] 実行後、sync_logs に新レコード
SHOULD:
  - [CMD] PoC と同じ出力件数
```

## Failure Modes
- **XML パーサが Deno で動かない**: `@xml-js/parser` や代替ライブラリを試す。最悪 PoC Python を外部 worker として呼ぶ fallback
- **Deno のタイムアウト**: Edge Function は最大 60 秒 (Free プラン). 200件取得が時間超過なら分割実行
- **Vault 復号エラー**: P5-02 完了が前提、profiles.cdm_card_no_vault_id が設定されているか確認

## Escalation
- Deno + XML の互換性問題で 3 日以内に解決しない場合、fallback として GitHub Actions + Python を選択
