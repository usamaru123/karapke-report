---
id: P5-04
title: Vercel デプロイ
phase: 5
type: human
depends_on: [P5-03]
blocks: []
agent: human + generator
estimated_minutes: 30
---

# P5-04: Vercel デプロイ

## Goal
MVP 完成の最終ステップ。Vercel にデプロイして本番稼働を開始する。

## Steps (Human)

### 1. GitHub リポジトリ作成・push
```bash
cd karaoke-app
git init
git add .
git commit -m "Initial commit"
# GitHub で repo 作成後
git remote add origin <repo-url>
git branch -M main
git push -u origin main
```

### 2. Vercel プロジェクト作成 🔴
- https://vercel.com にログイン
- 「Add New Project」→ GitHub repo を連携
- Framework Preset: Next.js (自動検出)
- Root Directory: `./` (monorepo なら該当フォルダ)
- Build Command: `pnpm build` (自動)

### 3. 環境変数設定 🔴
Vercel > Project > Settings > Environment Variables で以下を追加:

| 変数名 | 値 | Environment |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL | All |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key | All |
| `CRON_SECRET` (Cron を Vercel にした場合) | ランダム文字列 | Production |

⚠️ `SUPABASE_SERVICE_ROLE_KEY` は Vercel には**設定しない**。Edge Function 側 (Supabase) にのみ置く。

### 4. デプロイ実行 🔴
「Deploy」クリック。数分で初回デプロイ完了。

### 5. Supabase Auth の URL 設定 🔴
Supabase > Authentication > URL Configuration:
- Site URL: `https://<your-domain>.vercel.app`
- Redirect URLs: `https://<your-domain>.vercel.app/**`

### 6. 動作確認 🔴
本番 URL にアクセスし、以下を手動確認:
- [ ] ログインできる (Supabase Auth の redirect が本番 URL に向いている)
- [ ] レパ一覧に自分のデータが表示
- [ ] レパ詳細が開ける
- [ ] 履歴画面が表示
- [ ] セトリ作成・編集ができる
- [ ] 「取り込む」ボタンで Edge Function が呼ばれる
- [ ] ネットワーク DevTools で Service Role Key が leak していないことを確認

### 7. Cron 動作確認 (24時間後) 🟡
- Supabase > sync_logs に Cron からの自動実行レコードがあることを確認

## Outputs
- 本番 URL (https://<your-project>.vercel.app)
- GitHub リポジトリ (push 済み)
- 環境変数設定完了

## Evaluation
EVALUATION.md P5-04:
```yaml
MUST:
  - [HUMAN] 本番 URL で全画面動作確認
  - [CMD] Vercel の環境変数にSERVICE_ROLE_KEY が設定されていない (誤設定防止)
  - [HUMAN] Supabase Auth の Site URL が本番に向いている
SHOULD:
  - [HUMAN] 24時間後の Cron 初回実行を確認
```

## Failure Modes

### ログイン後に redirect がローカル URL に飛ぶ
原因: Supabase Auth の Site URL がまだ localhost
対処: Supabase Dashboard で本番 URL に更新

### Build がエラー
原因: TypeScript エラー、欠損した環境変数
対処: Vercel のビルドログを読んで該当修正

### Edge Function が 500
原因: Vercel → Supabase 間のネットワーク、JWT forwarding ミス
対処: sync action で渡している Authorization ヘッダが正しいか確認

## Escalation
- 本番で致命的なバグ発見 → 即座に人間へ通知、場合によっては rollback
