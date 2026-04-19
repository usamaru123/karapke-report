---
id: P1-07
title: 冪等性検証
phase: 1
type: verify
depends_on: [P1-06]
blocks: []
agent: evaluator
estimated_minutes: 5
---

# P1-07: 冪等性検証

## Goal
PoC スクリプトを複数回実行しても重複データが発生しないことを確認する。

## Steps
1. 現在の scores レコード数を記録:
   ```sql
   SELECT COUNT(*) AS before_count FROM scores;
   ```
2. sync を再実行:
   ```bash
   python scripts/sync_scores.py sync
   ```
3. レコード数を再確認:
   ```sql
   SELECT COUNT(*) AS after_count FROM scores;
   ```
4. `before_count == after_count` または僅かな増加 (DAM 側で新規発生した分のみ)

## Evaluation
```yaml
MUST:
  - after_count - before_count <= 歌唱頻度の日次上限 (例: 100)
  - sync 出力で "scores_new: 0" または少数
  - sync 出力で "scores_skipped" が before_count と同等
```

## Failure Modes
- **重複レコードが大量発生**: `dam_scoring_id` unique 制約が機能していない
  - schema.sql の `scores_dam_id_uniq` 制約が作成されているか確認:
    ```sql
    SELECT conname FROM pg_constraint WHERE conname = 'scores_dam_id_uniq';
    ```
  - `db.py` の `insert_score` で unique violation を正しく検知しているか確認

## Escalation
冪等性が壊れている場合、データ整合性の根本問題なので即座に human escalation
