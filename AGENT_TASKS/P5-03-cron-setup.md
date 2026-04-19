---
id: P5-03
title: Cron 設定
phase: 5
type: code
depends_on: [P5-02]
blocks: [P5-04]
agent: generator
estimated_minutes: 20
---

# P5-03: Cron 設定

## Goal
日次で sync-scores Edge Function を自動実行する Cron を設定する。

## Steps

### Option A: Supabase Scheduled Jobs (推奨、Pro プラン)
Supabase Dashboard > Database > Cron Jobs で以下を追加:
```sql
SELECT cron.schedule(
  'daily-sync-scores',
  '0 3 * * *',   -- 毎日 3:00 UTC = 日本時間 12:00
  $$
  SELECT net.http_post(
    url := 'https://<project>.supabase.co/functions/v1/sync-scores',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <service_role_key>',
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('trigger', 'cron')
  ) AS request_id;
  $$
);
```

### Option B: Vercel Cron (フリープランでも可、制限あり)
`karaoke-app/vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/sync/cron",
      "schedule": "0 3 * * *"
    }
  ]
}
```

`karaoke-app/app/api/sync/cron/route.ts`:
```ts
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  // Vercel Cron secret check
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Edge Function を呼ぶ (service role で全ユーザー分実行する場合は別ロジック)
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sync-scores`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ trigger: 'cron' }),
  })
  const data = await res.json()
  return NextResponse.json(data)
}
```

### Option C: GitHub Actions (完全フリー、自由度高)
`.github/workflows/sync.yml`:
```yaml
name: Daily DAM Sync

on:
  schedule:
    - cron: '0 3 * * *'  # 12:00 JST
  workflow_dispatch:      # 手動実行も可能

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Call sync-scores Edge Function
        run: |
          curl -X POST "${{ secrets.SUPABASE_URL }}/functions/v1/sync-scores" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{"trigger": "cron"}'
```

### 推奨: Option C
- 完全無料
- GitHub リポジトリの Secrets で管理、見通しよい
- 失敗時に GitHub Actions の UI で確認可能
- Vercel の Hobby プランの Cron 制限 (1 回/日) に縛られない

## Outputs
- 選択した Cron 設定ファイル (vercel.json か .github/workflows/sync.yml)
- Secrets 設定

## Evaluation
EVALUATION.md P5-03:
```yaml
MUST:
  - [FILE] Cron 設定ファイルが存在
  - [HUMAN] 24時間後に Cron が動いたことを sync_logs で確認
SHOULD:
  - [CMD] 失敗時に通知される仕組み
```

## Failure Modes
- **Cron が動かない**: スケジュール cron 式の文法ミス、UTC とタイムゾーン勘違い
- **権限エラー**: Cron から Edge Function を呼ぶときの認証
