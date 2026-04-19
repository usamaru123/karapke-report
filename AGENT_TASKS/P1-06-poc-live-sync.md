---
id: P1-06
title: PoC 本番同期
phase: 1
type: verify
depends_on: [P1-04]
blocks: [P1-07, P5-01]
agent: evaluator
estimated_minutes: 10
---

# P1-06: PoC 本番同期

## Goal
PoC スクリプトを本番モードで実行し、DAM API から取得したデータが Supabase に正しく永続化されることを確認する。

## Inputs
- P1-04 pass 済み (dry-run 成功)

## Steps
1. 本番同期実行:
   ```bash
   cd poc/karaoke-sync-poc
   python scripts/sync_scores.py sync
   ```
2. 終了後、Supabase 側のデータを確認:
   ```sql
   -- 基本チェック
   SELECT COUNT(*) FROM scores;
   SELECT COUNT(*) FROM songs;
   SELECT COUNT(*) FROM sessions;
   SELECT COUNT(*) FROM sync_logs WHERE status IN ('success', 'partial');

   -- トリガー動作確認
   SELECT COUNT(*) FROM scores WHERE vocal_range_highest IS NOT NULL;
   SELECT COUNT(*) FROM songs WHERE vocal_range_highest IS NOT NULL;
   SELECT AVG(score_count) FROM sessions;
   ```

## Outputs
- `scores` テーブルに取得件数分のレコードが INSERT されている
- `songs` に重複のない曲マスタが upsert されている
- `sessions` に時系列でセッションが作られている
- `sync_logs` に実行履歴が残っている

## Evaluation
EVALUATION.md の P1-04 を参照 (命名は P1-06 に読み替え):
```yaml
MUST:
  - [CMD] 終了コード 0
  - [DB] SELECT COUNT(*) FROM scores >= 1
  - [DB] SELECT COUNT(*) FROM songs >= 1
  - [DB] SELECT COUNT(*) FROM sessions >= 1
  - [DB] SELECT COUNT(*) FROM sync_logs WHERE status IN ('success', 'partial') >= 1
SHOULD:
  - [DB] songs.vocal_range_highest が複数の曲で非NULL
  - [DB] sessions.avg_score が複数セッションで非NULL (トリガー動作確認)
```

## Failure Modes

### scores INSERT エラー (foreign key 違反)
```
insert or update on table "scores" violates foreign key constraint "scores_user_id_fkey"
```
対処: `.env` の `TARGET_USER_ID` が `auth.users` に実在することを確認

### scores UNIQUE 制約違反
正常動作 (重複取込のスキップ)。Agent は無視して継続

### RLS エラー
```
new row violates row-level security policy
```
対処: service_role キーで接続しているか確認。supabase-py の create_client に ANON_KEY ではなく SERVICE_ROLE_KEY を渡す

### トリガーが動かない
症状: songs.vocal_range_highest が NULL のまま
原因: トリガー `scores_update_song_range` が作成されていない
対処: P1-02 で schema.sql が完全適用されたか確認:
```sql
SELECT tgname FROM pg_trigger WHERE tgname LIKE '%update_song_range%';
```

## Escalation
- write 失敗が 1 件でもあれば Evaluator は status='partial' と記録
- write 失敗が 50% 以上 → human escalation
