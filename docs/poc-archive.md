# PoC アーカイブ: karaoke-sync-poc

**Status**: 2026-04-22 削除済。この文書は PoC 本体の削除前に
「Edge Function に引き継がれていない運用ノウハウ」だけを抽出して残したもの。

元の場所: `poc/karaoke-sync-poc/` (git 履歴では `c3f785e` より前に参照可)

---

## PoC の役割と廃止理由

### 役割（当時）

Phase 1 で「DAM API が本当に取得できるか」「XML スキーマの実態」を検証する
単発スクリプト群。Python + httpx + lxml + Pydantic + Supabase-py で書かれ、
~200 件の採点履歴を Supabase に取り込むまでを CLI で完遂した。

### 廃止理由

Phase 5 で同等のロジックを Supabase Edge Function (`supabase/functions/sync-scores/`,
TypeScript/Deno) に移植完了。以降は cron + browser からの手動取込で運用されており、
Python PoC を実行する手段がアプリから呼ばれることは無くなった。

ただし **`.env` ファイルだけは** 以下 5 本の utility Python スクリプトから参照され続けていたため、
PoC 削除時にリポジトリ root `.env` へ移設した:

- `scripts/apply_and_verify_schema.py`
- `scripts/gen_supabase_types.py` (npm run db:types から呼ばれる)
- `scripts/seed_repertoire.py`
- `scripts/verify_rls.py`
- `scripts/verify_sync.py`

---

## PoC → Edge Function の移植マッピング

| PoC (Python) | Edge Function (TypeScript/Deno) |
|---|---|
| `src/dam_client.py` (httpx + lxml + tenacity) | `dam_client.ts` (fast-xml-parser + 内蔵 fetch + 手書きリトライ) |
| `src/parser.py` (Pydantic + field_validator) | `parser.ts` (手書きバリデータ) |
| `src/session_boundary.py` (3h ギャップ) | `session_boundary.ts` (同一ロジック) |
| `src/db.py` (supabase-py) | `db.ts` (`@supabase/supabase-js`) |
| `src/sync.py` (全体制御) | `sync.ts` (同左) |
| `scripts/sync_scores.py` (Click CLI) | `index.ts` (Edge Function エントリ) |

### 重要: raw_xml の形式差

PoC (`xmltodict.parse`) → `{"scoring": {"@intonation": "77", ...}}` (単一 `@`, wrapper あり)
Edge Function (`fast-xml-parser` with prefix `@_`) → `{"@_intonation": "77", ...}`

既存 200 件は PoC 形式で DB に残っており、新規分は Edge Function 形式になる。
`karaoke-app/lib/advice/raw-xml-extract.ts` の `readAttr()` が両形式を吸収する。

---

## 引き継ぎ対象の運用ノウハウ

### デバッグフロー: 「parse_failed がログに出た」場合

PoC では `python scripts/sync_scores.py show-xml <scoring_ai_id>` で生 XML を出力し、
属性名のマッピング崩れを手動で探す流れがあった。Edge Function に移行した現在は同等 CLI が
無いので、**手動で直接 DAM API を叩く**:

```bash
# .env から cdmCardNo を読み出して単一レコード取得
source .env
curl -sS \
  "https://www.clubdam.com/app/damtomo/scoring/GetScoringAiListXML.do?cdmCardNo=${DAM_CDM_CARD_NO}&scoringAiId=<ID>&detailFlg=1" \
  -H "User-Agent: karaoke-sync-debug/0.1" \
  -H "Accept: application/xml, text/xml"
```

属性名が `parser.ts` の `integer(attr(el, "XXX"))` と一致しているか目視確認。
相違あれば `parser.ts` を更新 → Edge Function 再デプロイ。

### デバッグフロー: 「score_already_exists が大量に出る」

これは正常動作。`scores_dam_id_uniq (user_id, scoring_type, dam_scoring_id)`
による冪等な増分同期の結果、既存分は全てスキップされる。初回 sync 後は毎回この状況。

### DB トリガー確認

`songs.vocal_range_*` が自動更新されない場合、トリガー活性を確認:

```sql
SELECT * FROM pg_trigger
WHERE tgname IN ('scores_update_song_range', 'scores_touch_session');
```

### セッション境界の調整

デフォルト 3 時間ギャップ。`.env` の `SESSION_GAP_HOURS` を変更すると
**次回以降の同期**から反映される（既存 `sessions` 行は変わらない）。
変更後に過去分も整理したい場合は `supabase/functions/sync-scores/session_boundary.ts`
の同ロジックを直接適用する scripts を書くか、手で `sessions` テーブルを再構築する。

### INIT モード（旧: `python scripts/sync_scores.py init`）

ユーザーの全データ (`scores`, `sessions`, `score_pitch_intervals`, `sync_logs`) を削除して
再取込する機能。PoC 廃止により CLI コマンドは消えたが、Supabase SQL Editor で
同等の DELETE を実行すれば再現可能:

```sql
-- TARGET_USER_ID を実 UUID に置換
DELETE FROM score_pitch_intervals WHERE user_id = 'TARGET_USER_ID';
DELETE FROM scores                 WHERE user_id = 'TARGET_USER_ID';
DELETE FROM sessions               WHERE user_id = 'TARGET_USER_ID';
DELETE FROM sync_logs              WHERE user_id = 'TARGET_USER_ID';
-- songs は共有マスタのため削除しない
```

その後ダッシュボードの「データを取り込む」ボタンで再取込。

---

## PoC からの教訓（再利用可能な知見）

### 1. `scoringAiId` で冪等性を担保すべし

DAM は同一歌唱に対して不変の `scoringAiId` を返す。これを uniq 制約の一部にすれば
再同期時の重複 INSERT を自動スキップできる (`scores_dam_id_uniq`)。
この設計は Edge Function にも継承済。

### 2. `raw_xml` を必ず全量保存

PoC 時点で `scores.raw_xml JSONB` にリクエスト生データを永続化する判断をしたため、
parser を後から拡張しても過去データから再抽出できた (例: `intonation`, `kobushiCount` 等)。
Edge Function でも同じ設計を踏襲している。

### 3. DAM API の上限 200 件

`dataCount="200" pageCount="40"` で頭打ち。古い履歴から落ちていくため、
**初回 sync は 200 件に限定される**。全履歴が欲しい場合は `scoringAiId` を
事前保存しておき単体取得で引くか、精密集計 DX-G 側をスクレイピングする
(コミュニティ実装 `llechi/karaoke-api` が該当機能を持つ)。

### 4. `detailFlg=1` は常に付ける

detailFlg 無しだと 5 項目レーダー + メタのみ、`intervalGraphPointsSection01..24`
と `aiSensitivityGraph*` が全欠損。詳細診断が一切できなくなる。

### 5. Windows で Python スクリプトを実行する際の注意

`scripts/*.py` を cmd / git-bash から実行すると cp932 エンコーディングで
絵文字や em-dash が `UnicodeEncodeError` を起こす。`python3 -X utf8 ...`
か `PYTHONIOENCODING=utf-8` を付けること。

---

## 参考コミット

- `c3f785e` Advice engine 投入 (PoC の raw_xml 形式対応を含む)
- `1aa5c9c` 以前 — この時点まで `poc/karaoke-sync-poc/` が有効
- PoC 削除コミット — このファイルを生成したコミット (以降 PoC ディレクトリは git 履歴内のみ)
