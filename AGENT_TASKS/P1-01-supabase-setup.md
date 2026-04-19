---
id: P1-01
title: Supabase プロジェクト作成
phase: 1
type: human
depends_on: []
blocks: [P1-02, P1-03]
agent: human
estimated_minutes: 15
---

# P1-01: Supabase プロジェクト作成

## Goal
新規 Supabase プロジェクトを作成し、認証情報 (URL, keys) を取得する。

## Inputs
- HUMAN_CHECKPOINTS.md の HC-P1-01 節

## Steps (Human)
1. https://supabase.com にログイン
2. 「New Project」で新規作成:
   - Organization: 任意
   - Name: `karaoke-app`
   - Region: `Northeast Asia (Tokyo)` 推奨
   - Database Password: 強力なパスワード
3. プロジェクト初期化完了を待つ (数分)
4. Settings > API から以下を控える:
   - Project URL
   - `anon` public key
   - `service_role` secret key
5. Settings > Database > Extensions で以下を Enable:
   - `supabase_vault`
   - `pg_trgm` (schema.sql 内で使用)
   - `uuid-ossp` (schema.sql 内で使用)
6. Authentication > Users で自分用テストユーザーを作成し、UUID をコピー

## Outputs
- Supabase プロジェクトが稼働中
- 以下の 4 つの文字列を手元に保持:
  - SUPABASE_URL
  - SUPABASE_ANON_KEY
  - SUPABASE_SERVICE_ROLE_KEY
  - TARGET_USER_ID (auth.users.id)

## Evaluation
EVALUATION.md の P1-01 を参照。[HUMAN] 判定のみ。

## Failure Modes
- **Vault 拡張が見つからない**: 古い Supabase プロジェクトの可能性。Pro プラン以上で利用可能。無料プランの場合は Vault を諦めて `profiles` に暗号化した平文を保存する fallback を検討
- **Region 選択ミス**: 東京以外で作成すると日本からの latency が悪化。削除して作り直し推奨

## Escalation
このタスクは human 専用。Agent は実行せず、人間からの完了通知を待つ。
