# karaoke-sync-poc

DAM 採点 Ai 履歴を Supabase に取り込む PoC スクリプト。

## 前提

- Python 3.11+
- Supabase プロジェクト（`schema.sql` 適用済み）
- DAM★とも の cdmCardNo（あなたのアカウントのカード番号）
- Supabase Auth にユーザーが 1 人作成済み（その UUID を `TARGET_USER_ID` に設定）

## セットアップ

```bash
# 仮想環境
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# 依存インストール
pip install -e .

# 環境変数
cp .env.example .env
# .env を開いて値を設定:
#   DAM_CDM_CARD_NO
#   SUPABASE_URL
#   SUPABASE_SERVICE_ROLE_KEY
#   TARGET_USER_ID
```

## 使い方

### 通常の増分同期（べき等）

```bash
python scripts/sync_scores.py sync
```

DAM API から全ページ取得 → 新規分だけ INSERT。既存レコードは `dam_scoring_id` の unique 制約でスキップされる。

### ドライラン（DB に書かない）

```bash
python scripts/sync_scores.py sync --dry-run
```

パーサのデバッグ用。ネットワーク経由で取得＆パースするが、DB 書き込みは発生しない。

### INIT モード（破壊的、デバッグ用）

```bash
python scripts/sync_scores.py init
```

対象ユーザーの `scores / sessions / score_pitch_intervals / sync_logs` を全削除し、一から取得し直す。`songs` は共有マスタなので削除しない。確認プロンプトが出る。`--yes` で確認スキップ。

### 1レコードだけ表示（パーサ検証）

```bash
python scripts/sync_scores.py show-one <scoring_ai_id>
python scripts/sync_scores.py show-xml <scoring_ai_id>  # raw XML
```

## プロジェクト構造

```
karaoke-sync-poc/
├── pyproject.toml          # 依存関係
├── .env.example            # 環境変数テンプレ
├── README.md
├── src/
│   ├── dam_client.py       # DAM API クライアント（httpx + lxml + tenacity）
│   ├── parser.py           # XML → ParsedScore (Pydantic) 変換
│   ├── session_boundary.py # セッション境界判定（3時間ギャップルール）
│   ├── db.py               # Supabase 書き込みラッパー
│   └── sync.py             # 全体オーケストレーション
└── scripts/
    └── sync_scores.py      # CLI エントリポイント (Click)
```

## 動作保証範囲

- ✅ DAM API 呼び出し（ページネーション、リトライ、エラーハンドリング）
- ✅ XML パース（主要フィールド、音域、レーダー5項目、24区間ピッチ）
- ✅ 曲マスタ upsert（normalized title + artist で重複排除）
- ✅ セッション境界判定（3時間ギャップ、既存セッション延長）
- ✅ scores idempotent insert（dam_scoring_id で重複検出）
- ✅ score_pitch_intervals（detailFlg=1 のみ）
- ✅ sync_logs 記録
- ✅ INIT モード（全データ削除 → 再取込）
- ✅ 構造化ログ（structlog）

## 動作保証外（= 将来の課題）

- ❌ cdmCardNo の Vault 読み書き（PoC では .env 直書き）
- ❌ 複数ユーザー並列実行
- ❌ Vercel Cron / Edge Function 対応
- ❌ XML スキーマの完全網羅（未知の属性は raw_xml にのみ残る）
- ❌ エラー発生時の自動通知

## デバッグのヒント

### 「parse_failed」ログが出る

```bash
python scripts/sync_scores.py show-xml <scoring_ai_id>
```

で生 XML を確認 → `parser.py` の属性名マッピングを修正。

### 「score_already_exists」が大量に出る

正常。再同期時は既存分がスキップされる。

### scores は INSERT されるが songs の vocal_range が更新されない

DB トリガー `songs_update_range_from_score` が有効か確認:

```sql
SELECT * FROM pg_trigger WHERE tgname = 'scores_update_song_range';
```

### セッションの分かれ方がおかしい

`.env` の `SESSION_GAP_HOURS` を調整（デフォルト3時間）。

## 次のステップ

このPoCが動いたら、Claude Code に以下を渡して Next.js 実装へ:

1. `schema.sql`
2. `data-model.md`
3. `karaoke-app-design-spec.md`
4. `src/parser.py`（XMLパースロジックは本番でも流用可）
5. Claude Design の Hand off URL
