---
id: P1-03
title: PoC .env 設定
phase: 1
type: human
depends_on: [P1-01]
blocks: [P1-04]
agent: human
estimated_minutes: 5
---

# P1-03: PoC .env 設定

## Goal
PoC スクリプトの `.env` ファイルに認証情報と設定値を記入する。

## Steps (Human)
1. `cd poc/karaoke-sync-poc`
2. `cp .env.example .env`
3. `.env` を開き、以下を記入:
   ```
   DAM_CDM_CARD_NO=<20文字のカード番号>
   SUPABASE_URL=<P1-01 で取得>
   SUPABASE_SERVICE_ROLE_KEY=<P1-01 で取得>
   TARGET_USER_ID=<P1-01 で作成したユーザーの UUID>
   ```

## Outputs
- `.env` ファイルが存在、4 変数すべて非空

## Evaluation
```bash
grep -E "^(DAM_CDM_CARD_NO|SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY|TARGET_USER_ID)=.+" .env | wc -l
# 期待: 4
```

## Failure Modes
- **cdmCardNo が分からない**: DAM★とも Web にログインし、開発者ツールで Cookie または URL パラメータから取得
- **UUID の形式が違う**: auth.users.id の UUID 形式 (`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`) を確認

## Escalation
Agent は実行せず、人間の完了通知を待つ。
