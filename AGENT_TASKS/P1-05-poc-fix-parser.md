---
id: P1-05
title: Parser 修正ループ
phase: 1
type: code
depends_on: [P1-04]
blocks: [P1-06]
agent: generator
estimated_minutes: 20
conditional: run_if_previous_failed
---

# P1-05: Parser 修正ループ

## Goal
`parser.py` の XML 属性名マッピングを実際の DAM レスポンスに合わせる。

## Inputs
- P1-04 で出た `parse_failed` ログ (scoring_ai_id を含む)
- `poc/karaoke-sync-poc/src/parser.py` (編集対象)
- `poc/karaoke-sync-poc/src/dam_client.py` (読み取り)

## Steps
1. `parse_failed` ログから scoring_ai_id を 1 つ取得
2. 生 XML を取得:
   ```bash
   python scripts/sync_scores.py show-xml <scoring_ai_id>
   ```
3. 取得した XML を保存:
   ```bash
   python scripts/sync_scores.py show-xml <id> > tests/fixtures/real_sample.xml
   ```
4. XML の属性名と `parser.py` の `_get_attr(el, "...")` 呼び出しを比較
5. 不一致な属性名を修正
6. 修正後、再度 P1-04 を実行して検証

## 属性名の既知の候補マッピング

パーサは以下の推測マッピングで書かれている。実 XML と照合:

| parser.py が探す名前 | 代替候補 |
|---|---|
| `scoringDateTime` | `scoringDate`, `createdAt`, `singDateTime` |
| `contentsName` | `songName`, `title`, `contentName` |
| `artistName` | `artist`, `singer` |
| `scoringResult` | `totalScore`, `score`, `result` |
| `pitchScore` | `pitch`, `scorePitch` |
| `stabilityScore` | `stability`, `scoreStability` |
| `expressionScore` | `expression`, `scoreExpression` |
| `vibratoLongtoneScore` | `vibratoLongtone`, `vibLong`, `vibrato` |
| `rhythmScore` | `rhythm`, `scoreRhythm` |
| `aiBonus` | `aiBonusPoint`, `aiAddition` |
| `scoringKeyControl` | `keyControl`, `key` |
| `vocalRangeLowest` | `rangeLowest`, `songRangeLow`, `lowestNote` |
| `vocalRangeHighest` | `rangeHighest`, `songRangeHigh`, `highestNote` |
| `singingRangeLowest` | `voiceRangeLowest`, `mySingRangeLow` |
| `singingRangeHighest` | `voiceRangeHighest`, `mySingRangeHigh` |
| `pitchGraphNode` | `pitchGraph`, `pitchIntervals`, `pitchBars` |

## Outputs
- `src/parser.py` の属性名が実 XML に一致
- `tests/fixtures/real_sample.xml` にサンプル XML が保存
- `parse_failed` ログが 0 件になる

## Evaluation
P1-04 の Evaluation を再実行。

## Failure Modes

### 必須フィールド (sung_at, song_title, total_score) が XML に見つからない
原因: DAM API の仕様が大幅に変わった、または想定と異なる endpoint を叩いている
対処:
1. `dam_client.py` の `DEFAULT_ENDPOINT` を確認
2. 生 XML の全体構造を確認 (最上位要素は `<response>` か？)
3. 必要なら `dam_client.py` も修正

### XML が空
原因: DAM 側で scoring_ai_id が既に 200 件制限で削除された可能性
対処: 別の scoring_ai_id で再試行

### 属性ではなく子要素として値が存在
例:
```xml
<scoring scoringAiId="123">
  <scoringResult>90.298</scoringResult>  <!-- 属性ではなく子要素 -->
</scoring>
```
対処: parser.py で `_get_attr()` の代わりに `_get_child_text()` を使う

## Escalation
- 5 回の属性名修正でも `parse_failed` が解消しない → human escalation
- 生 XML が予想と大幅に異なる構造 → 設計見直しのため human に相談
