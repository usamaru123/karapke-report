# データモデル設計書

カラオケレパートリー管理アプリの Supabase スキーマ定義と設計判断のまとめ。

---

## 1. 全体像

### テーブル一覧

| テーブル | 役割 | RLS |
|---|---|---|
| `profiles` | ユーザープロファイル、cdmCardNo への Vault 参照 | ✅ 自分のみ |
| `songs` | 曲マスタ（ユーザー横断の共有カタログ） | ❌ 全員読める |
| `sessions` | カラオケ訪問単位のセッション | ✅ 自分のみ |
| `scores` | 採点レコード、永久保存 | ✅ 自分のみ |
| `score_pitch_intervals` | 24区間ピッチ等の詳細、`detailFlg=1` の分のみ | ✅ 自分のみ |
| `repertoire` | レパートリー登録（曲＋個人メタ情報） | ✅ 自分のみ |
| `setlists` | セトリ本体 | ✅ 自分のみ |
| `setlist_items` | セトリ内の曲、position で順序管理 | ✅ 自分のみ |
| `sync_logs` | DAM API 同期の実行ログ | ✅ 自分のみ |

### ER 関係

```
auth.users (Supabase)
    │
    ├─── profiles                (1:1)
    │       └── vault.secrets    (cdmCardNo 暗号化保管)
    │
    ├─── sessions ─── scores ───┐
    │                    │       │
    │                    │       ├── score_pitch_intervals (1:1, 任意)
    │                    │       └── songs (多:1)
    │                    │
    ├─── repertoire ─── songs
    │
    └─── setlists ─── setlist_items ─── songs
```

---

## 2. 設計判断の根拠

### Q1: マルチテナント設計

- 全ユーザースコープのテーブルに `user_id UUID NOT NULL REFERENCES auth.users(id)` を持たせる
- RLS ポリシーは `USING (user_id = auth.uid())` で一律統制
- `songs` のみ RLS 無効（ユーザー横断の共有カタログ）。将来個別管理に切り替えたくなったら `user_songs` テーブルを足して移行可

### Q2: 採点履歴の永久保存

- `scores` に `dam_scoring_id` ユニーク制約で重複取込防止
- 200件超えの分も DAM API が返す限り取り込み続ける
- 取り込み済みレコードは DAM 側で消えても `scores` に残る
- `raw_xml` を jsonb で全件保持 → スキーマ変更時の再処理余地を確保

### Q3: 採点詳細データの構造化

- **レーダー5項目**（音程、安定性、表現力、ビブラート&ロングトーン、リズム）は `scores` 本体に列として持つ。ダッシュボードやレパ詳細で頻出するため集計・ソートしやすい
- **24区間ピッチ**は別テーブル `score_pitch_intervals`。大きい＋詳細画面以外使わないので分離
- **Ai感性グラフ・音程バー時系列等**は `score_pitch_intervals.details JSONB` に追い出す
- **`raw_xml`** はすべての保険

**読み取り時**:
- 一覧画面のクエリは `scores` 本体のみ → 速い
- 詳細画面は `scores + score_pitch_intervals` を JOIN

### Q4: ENUM型で厳密に

- `confidence_level`: practicing / normal / confident
- `range_source`: dam_ai / audio_analysis / manual
- `scoring_type`: ai / ai_heart / dxg / dx / other
- **タグ**は ENUM にせず `TEXT[]` で自由度を残す（ユーザー定義タグが MVP の価値のため）

将来 ENUM 拡張する場合:
```sql
ALTER TYPE confidence_level ADD VALUE 'expert';
```
PG15+ なら `BEFORE/AFTER` 指定も可。

### Q5: 音域データの更新方針

- `songs.vocal_range_*` は**最新の採点時の値で上書き**
- `songs_update_range_from_score()` トリガーが `scores` INSERT 時に自動更新
- `range_updated_at` で「最新の真実」を保証（古い採点が後から来ても上書きしない）

**想定ユースケース**: DAM 側の楽曲改訂でガイドメロディが変わるケースに追従。

**リスク**: DAM 側が誤って音域を変えた場合、ユーザーが気づきにくい。これは `scores.vocal_range_*` に歴代の値が残るので、後から検証可能。

### Q6: cdmCardNo は Supabase Vault で暗号化

- `vault.secrets` に保存、`profiles.cdm_card_no_vault_id` は UUID 参照のみ
- **クライアントから直接 plaintext を取れない設計**
- `get_cdm_card_no_for(user_id)` は `service_role` 専用（Edge Function やサーバーサイド Cron からのみ呼ぶ）
- `set_my_cdm_card_no(text)` はユーザー本人が自分の番号を登録する用

### Q7: セッションテーブルあり

- `sessions` を明示的に作成、`scores.session_id` でリンク
- セッション境界は**アプリケーション層で判定**（前の採点との時間差 ≤ 3時間なら同セッション）
- 集計（`score_count`、`avg_score`、`max_score`）はトリガー `scores_touch_session()` で自動更新
- 境界ルールが変わった場合はバッチで再計算可能

---

## 3. Supabase 埋め込み select 記法の制約

PostgREST の埋め込み select 記法 `.from(A).select('*, ref:B(...)')` は、
**A と B の間に直接の外部キー (FK) 関係が必要** です。間接関係（共通 parent を
介した兄弟関係など）は解決できず `PGRST200` エラーになります。

FK の向きは双方向とも OK: `A.b_id → B.id` でも `B.a_id → A.id` でも埋め込み可能。

### このプロジェクトのパターン早見表

| from → 埋め込み先 | 結果 | 理由 |
|---|---|---|
| `repertoire` → `scores` | ❌ PGRST200 | `songs` 経由の兄弟、直接 FK なし |
| `repertoire` → `songs` | ✅ 動作 | `repertoire.song_id → songs.id` |
| `scores` → `songs` | ✅ 動作 | `scores.song_id → songs.id` |
| `scores` → `sessions` | ✅ 動作 | `scores.session_id → sessions.id` |
| `sessions` → `scores` | ✅ 動作 | 逆方向も OK (`scores.session_id`) |
| `setlists` → `setlist_items` → `songs` | ✅ 動作 | 2 段階 FK (setlist_items が両者を繋ぐ) |

**迷ったら**: [sql/schema.sql](../sql/schema.sql) の `REFERENCES` 句を grep すれば
FK の実在を即座に確認できる。

### 兄弟テーブルを結合したいときの回避策

直接埋め込みが無理な場合:

1. **共通 parent 経由の多段埋め込み** — `.from(A).select('*, parent:P(*, sibling:B(*))')`
   （実機未検証、次に該当ケースで試す）
2. **別クエリ + JS 側結合** — A を取得→`id` リストを `.in()` で B に渡す→JS で Map 化
   （[lib/queries/repertoire.ts](../karaoke-app/lib/queries/repertoire.ts) で採用中）
3. **Postgres RPC 関数** — サーバ側 SQL で JOIN、クライアントは `.rpc()` で呼ぶ
   （複雑なクエリや WITH CTE が必要なときの最終手段）

---

## 4. 主要ユースケースごとのクエリ例

### repertoire ↔ scores の結合方法

前セクション 3 の通り、`.from('repertoire').select('*, scores:scores(...)')`
は PGRST200 で動きません。現在の実装と将来候補を分けて記録:

**現在の実装方針**:
- JS 側 groupBy — [lib/queries/repertoire.ts](../karaoke-app/lib/queries/repertoire.ts)
  で `repertoire` と `scores` を別クエリで取得し、`song_id` で集計

**将来の最適化候補（未検証）**:
- `songs` を経由した多段埋め込み: `.from('repertoire').select('*, song:songs(*, scores(*))')`
- Phase 4 のレパ詳細画面実装時に実機検証し、動けば差し替え（1 クエリで完結し効率的）

**生 SQL**:
- LATERAL JOIN で相関サブクエリとして表現可能。下の「90点以上の曲」例がそれ。
  `repertoire` の各行に対して `scores` から「最高点 1 行」を取り出す必要があり、
  通常の JOIN では行を複製してから GROUP BY する形になるため、LATERAL のほうが
  意図を直接表現できる。

### ダッシュボード：今月の自己ベスト

```sql
SELECT
  s.total_score, sg.title, sg.artist, s.sung_at
FROM scores s
JOIN songs sg ON sg.id = s.song_id
WHERE s.user_id = auth.uid()
  AND s.sung_at >= date_trunc('month', NOW())
ORDER BY s.total_score DESC
LIMIT 1;
```

### レパートリー一覧：90点以上の曲（最高点順）

```sql
SELECT
  r.*,
  sg.title, sg.artist,
  max_score.total_score AS best_score,
  max_score.sung_at     AS last_sung_at
FROM repertoire r
JOIN songs sg ON sg.id = r.song_id
LEFT JOIN LATERAL (
  SELECT total_score, sung_at
  FROM scores
  WHERE song_id = r.song_id AND user_id = r.user_id
  ORDER BY total_score DESC
  LIMIT 1
) max_score ON TRUE
WHERE r.user_id = auth.uid()
  AND max_score.total_score >= 90
ORDER BY max_score.total_score DESC;
```

### 採点履歴：セッション単位のグルーピング

```sql
SELECT
  ses.id, ses.started_at, ses.score_count, ses.max_score,
  json_agg(
    json_build_object(
      'sung_at', sc.sung_at,
      'title', sg.title,
      'artist', sg.artist,
      'score', sc.total_score,
      'key', sc.key_control
    ) ORDER BY sc.sung_at
  ) AS songs
FROM sessions ses
JOIN scores sc ON sc.session_id = ses.id
JOIN songs sg  ON sg.id = sc.song_id
WHERE ses.user_id = auth.uid()
GROUP BY ses.id
ORDER BY ses.started_at DESC
LIMIT 20;
```

### レパ詳細：歌唱推移（直近10回）

```sql
SELECT sung_at, total_score, key_control
FROM scores
WHERE user_id = auth.uid() AND song_id = $1
ORDER BY sung_at DESC
LIMIT 10;
```

---

## 5. 取り込みフロー（PoC 参考）

Edge Function またはサーバーサイドバッチで以下を実行:

```
1. profiles から vault secret_id を取得
2. get_cdm_card_no_for(user_id) で cdmCardNo を復号
3. DAM API (GetScoringAiListXML.do) を叩く
4. XML をパース → scores 配列に変換
5. トランザクション内で:
   - 曲マスタ upsert (songs)
   - セッション境界判定 (前の score との時間差で新規 or 既存)
   - scores INSERT (dam_scoring_id で ON CONFLICT DO NOTHING)
   - detailFlg=1 なら score_pitch_intervals も INSERT
6. sync_logs 更新
```

トリガー側が:
- songs.vocal_range を自動更新
- sessions の集計を自動更新

してくれるので、取り込み側は単純な INSERT で済む。

---

## 6. インデックス戦略

MVP で作ったインデックス:

- `songs (title_normalized, artist_normalized) UNIQUE` — 曲マスタの重複防止
- `songs (title gin_trgm_ops)`, `songs (artist gin_trgm_ops)` — 曲検索の ILIKE / similarity
- `sessions (user_id, started_at DESC)` — 履歴画面の時系列取得
- `scores (user_id, sung_at DESC)` — ダッシュボードの「最近の歌唱」
- `scores (song_id, sung_at DESC)` — レパ詳細の歌唱推移
- `scores (user_id, total_score DESC)` — 「90+達成曲」等のフィルタ
- `repertoire (user_id)` — レパ一覧取得
- `repertoire (user_id) WHERE is_favorite` — 部分インデックスでお気に入り絞り込み高速化
- `repertoire USING GIN (tags)` — タグ検索

将来必要になったら:
- `scores (session_id, sung_at)` — 1セッション内の曲順表示
- `setlist_items (setlist_id, position)` — DnD reorder

---

## 7. 将来拡張の余地

設計上、以下は後から足せる:

- **音源アップロード＋自前解析**: `songs.range_source = 'audio_analysis'` の値を追加済み
- **複数カラオケ機種**: `scoring_type` ENUM に値追加
- **フレンド機能**: `songs` が共有カタログなので、`friendships` テーブルと JOIN で他人のスコア閲覧可
- **オススメ曲**: `scores` + `repertoire` を Claude API に渡して推論
- **JOYSOUND 対応**: `scoring_type` に 'joysound_ai' 等追加、`raw_xml` を JSON 構造として扱う

---

## 8. 運用上の注意

- **`raw_xml` は永久保持**。サイズが増えても消さない方針（通常 5-10KB/row、100万件でも 10GB 程度）
- **`scores.dam_scoring_id`** で重複取込は排除されるが、逆に**DAM側がscoring_id を再発行した場合は重複が発生しうる**。初期運用で監視
- **Vault のキーローテーション**: Supabase 側で管理、アプリは意識不要
- **セッション境界判定ルール（3時間）**は `app/lib/session.ts` のような形で定数化し、DB DDL には入れない

---

## 9. 未決定事項（MVP 後に判断）

- Ai Heart の `ai_heart_score` などの追加列（追加採点タイプが増えたら拡張）
- 曲マスタの重複マージ（「Lemon」vs「Lemon （米津玄師版）」等の表記ゆれ）
- セトリのテンプレ機能（`setlists.is_template BOOLEAN` 等）
- 統計ビュー（月次 summary table）のマテリアライズ
