---
id: P1-02
title: Schema 適用
phase: 1
type: code
depends_on: [P1-01]
blocks: [P1-04, P3-01]
agent: generator
estimated_minutes: 5
---

# P1-02: Schema 適用

## Goal
`sql/schema.sql` を Supabase プロジェクトに適用し、全テーブル・ENUM・RLS・トリガーを作成する。

## Inputs
- `sql/schema.sql` (読み取り専用、変更厳禁)
- P1-01 で取得した SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

## Steps
1. `psql` または Supabase Dashboard の SQL Editor で `sql/schema.sql` を実行
2. エラーが出たら Failure Modes 参照

### 推奨: CLI 経由
```bash
# psql 接続文字列は Supabase Dashboard > Settings > Database で取得
psql "$SUPABASE_DB_URL" -f sql/schema.sql
```

### 代替: SQL Editor (手動)
Supabase Dashboard > SQL Editor > New Query で `sql/schema.sql` の内容をコピペして Run

## Outputs
- public schema に以下のテーブルが存在:
  - profiles, songs, sessions, scores, score_pitch_intervals
  - repertoire, setlists, setlist_items, sync_logs
- ENUM: confidence_level, range_source, scoring_type
- 関数: set_my_cdm_card_no, get_cdm_card_no_for, set_updated_at,
        refresh_session_stats, scores_touch_session, songs_update_range_from_score
- RLS policies 10+ 個

## Evaluation
EVALUATION.md の P1-02 を参照。主要チェック:
```sql
-- テーブル数
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';
-- 期待: 9

-- ENUM 数
SELECT COUNT(*) FROM pg_type WHERE typname IN ('confidence_level', 'range_source', 'scoring_type');
-- 期待: 3

-- RLS policy 数
SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';
-- 期待: 10+
```

## Failure Modes

### Extension エラー
```
ERROR: extension "supabase_vault" does not exist
```
対処: Supabase Dashboard で supabase_vault 拡張を有効化 (HC-P1-01 参照)

### 既存テーブルとの衝突
```
ERROR: relation "songs" already exists
```
対処: 既存オブジェクトを DROP するか、初期化前の状態に戻す:
```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres, anon, authenticated, service_role;
```
その後 schema.sql を再実行

### 権限エラー
```
ERROR: permission denied to create extension
```
対処: service_role 権限で接続しているか確認。anon/authenticated では不可

## Escalation
- 3 回連続失敗 → 人間に schema.sql または Supabase プロジェクト設定を確認依頼
- Vault 拡張が有効化できない場合 → 設計変更 (Vault なしで進めるか) を人間に相談
