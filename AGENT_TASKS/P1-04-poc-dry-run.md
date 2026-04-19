---
id: P1-04
title: PoC Dry-Run
phase: 1
type: verify
depends_on: [P1-02, P1-03]
blocks: [P1-05, P1-06]
agent: evaluator
estimated_minutes: 5
---

# P1-04: PoC Dry-Run

## Goal
PoC スクリプトを dry-run モードで実行し、DAM API から正しくデータが取得・パースできることを確認する。DB 書き込みは行わない。

## Inputs
- `poc/karaoke-sync-poc/` プロジェクト
- P1-03 で設定した `.env`

## Steps
1. 仮想環境セットアップ (未実施なら):
   ```bash
   cd poc/karaoke-sync-poc
   python -m venv .venv
   source .venv/bin/activate  # Windows: .venv\Scripts\activate
   pip install -e .
   ```
2. Dry-run 実行:
   ```bash
   python scripts/sync_scores.py sync --dry-run
   ```
3. 出力ログを確認

## Outputs
- stdout に以下が含まれること:
  - `dry_run_mode` (警告メッセージ)
  - `fetch_complete fetched=<N> parsed=<N>` で fetched > 0
  - `parse_failed` が 0 件

## Evaluation
```bash
OUTPUT=$(python scripts/sync_scores.py sync --dry-run 2>&1)
echo "$OUTPUT" | grep -q "dry_run_mode" && \
echo "$OUTPUT" | grep -q "fetch_complete" && \
! echo "$OUTPUT" | grep -q "parse_failed"
```

## Failure Modes

### `parse_failed` が出る
原因: `parser.py` の属性名が実際の DAM XML と一致していない
対処: **P1-05 タスクに移行**。具体的には:
1. `parse_failed` ログから scoring_ai_id を 1 つ拾う
2. `python scripts/sync_scores.py show-xml <scoring_ai_id>` で生 XML を取得
3. XML の属性名と `src/parser.py` の `_get_attr()` 呼び出しを比較
4. 属性名を修正

### HTTP 403 / 401
原因: cdmCardNo が無効、もしくは DAM★とも 側で公開設定 OFF
対処: 人間にエスカレーション (HUMAN_CHECKPOINTS.md HC-00-01)

### HTTP 429
原因: レート制限
対処: `dam_client.py` の `REQUEST_INTERVAL_SEC` を増やして再試行

### ConnectTimeout
原因: ネットワーク問題、もしくは DAM サーバーがダウン
対処: 1 分待って再試行。3 回連続で失敗なら human escalation

### "fetched=0"
原因: カード番号が有効だが採点履歴が 0 件
対処: DAM★とも Web にログインして採点履歴があることを確認

## Escalation
- `parse_failed` が出た → P1-05 に自動移行
- HTTP 4xx/5xx が 3 回連続 → human escalation
- fetched=0 が 3 回連続 → human escalation
