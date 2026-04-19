# Human Checkpoints (HUMAN_CHECKPOINTS.md)

完全自律実装には限界がある。ここでは**人間の判断・操作・承認が必要**なタイミングを明示する。これらは Harness が自動でスキップせず、必ず人間に control を返す。

## チェックポイントの分類

- 🔴 **Blocking**: 人間の操作がないと次に進めない
- 🟡 **Review**: 人間のレビュー推奨だが、緊急時は自動承認も可
- 🟢 **Notification**: 通知のみ、人間不在でも進行可

---

## Phase 0: 開始前の準備 🔴

### HC-00-01: DAM アカウントと cdmCardNo の確認

- [ ] 自分の DAM★とも アカウントでログインできる
- [ ] `https://www.clubdam.com/app/damtomo/scoring/` にアクセスして採点履歴が表示される
- [ ] URL または API 呼び出しから cdmCardNo (20 文字の base64 文字列) を取得できる
- [ ] 公開設定で「採点履歴を公開」にしている (非公開だと API が動かない可能性)

**代替手段**: 既に実機検証済みの cdmCardNo がある場合はスキップ

---

## Phase 1: データ基盤

### HC-P1-01: Supabase プロジェクト新規作成 🔴

**なぜ人間が必要か**: Supabase Dashboard の Web UI 操作が必要。Claude Code が Web ブラウザ自動操作できない前提。

- [ ] https://supabase.com にログイン
- [ ] 「New Project」で新規作成
  - Organization: 任意
  - Name: `karaoke-app` など
  - Region: `Northeast Asia (Tokyo)` 推奨
  - Database Password: 強力なパスワードを設定 (パスワードマネージャ推奨)
- [ ] プロジェクト作成完了後、Settings > API から以下を控える:
  - Project URL
  - anon public key
  - service_role key
- [ ] Settings > Database > Extensions で `supabase_vault` を Enable

**完了判定**: 上記の 3 つのキーが手元にある

### HC-P1-02: PoC の .env 設定 🔴

**なぜ人間が必要か**: 秘密情報 (cdmCardNo, service_role_key) をファイルに書く。

- [ ] `poc/karaoke-sync-poc/.env.example` を `.env` にコピー
- [ ] 以下の値を設定:
  ```
  DAM_CDM_CARD_NO=<実際のカード番号>
  SUPABASE_URL=https://xxxxx.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
  TARGET_USER_ID=<作成したテストユーザーの UUID>
  ```

**完了判定**: `.env` ファイルが存在し、4 つの必須変数が空でない

### HC-P1-03: Supabase Auth でテストユーザー作成 🔴

- [ ] Supabase Dashboard > Authentication > Users
- [ ] 「Add User」で自分用の Email + Password を登録
- [ ] 作成後、ユーザー UUID をコピーして `.env` の `TARGET_USER_ID` に設定

**完了判定**: `auth.users` に 1 行存在、UUID が `.env` に入っている

### HC-P1-04: PoC Dry-Run 結果のレビュー 🟡

**なぜレビューか**: `parse_failed` が出た場合、parser.py の修正方針を人間が判断する必要がある。

- [ ] `python scripts/sync_scores.py sync --dry-run` の出力を見る
- [ ] `parse_failed` が出ていないか確認
- [ ] 出ていた場合、`show-xml <scoring_ai_id>` で生 XML を確認し、attribute 名のマッピングを修正

**自動化可能**: Evaluator が `parse_failed` を検出 → `show-xml` 実行 → Generator に属性名修正を依頼、の loop は自動化可

---

## Phase 2: Next.js プロジェクト初期化

### HC-P2-01: プロジェクトディレクトリの配置 🟡

**なぜレビューか**: プロジェクトをどのディレクトリに作るか、既存のファイルを上書きしないかを人間が確認すべき。

- [ ] Claude Code が `karaoke-app/` を作成する前に、既存の同名ディレクトリがないか確認
- [ ] Next.js の init オプション (src/ を使うか、App Router か、など) を確認

**推奨**: App Router、`src/` なし、TypeScript、Tailwind、ESLint

---

## Phase 4: 画面実装

### HC-P4-DESIGN: Claude Design との視覚的一致レビュー 🟡

**なぜ人間が必要か**: 「Claude Design のスクショと実装が似ているか」は数値化しづらい。pixel diff は目安だが、デザインの「意図」が伝わっているかは人間判断。

各画面実装後にレビュー:

- [ ] プロトタイプのスクショと実装を並べて見る
- [ ] 以下の観点で評価:
  - 情報階層 (ヒーロー、重要数値、補助情報) が保たれているか
  - ネオンピンク glow の使い所が仕様通りか (90+ のみ)
  - 余白・フォントサイズが大きく違っていないか
- [ ] 許容範囲外なら Agent に修正依頼

**自動化可能な部分**: pixel diff > 20% は NG として Evaluator が自動ブロック、20-10% は Human review に回す、10% 未満は自動 OK

### HC-P4-DATA: 実データでの動作確認 🔴

**なぜ人間が必要か**: 実際に自分の歌唱データを見て、情報の粒度・並び順・絞り込みが直感的か判断。

- [ ] 自分のレパートリーで 10-20 曲追加してみる
- [ ] フィルタで想定通りの絞り込みができる
- [ ] セトリを作成して DnD で並べ替えができる

---

## Phase 5: デプロイ

### HC-P5-01: Vercel アカウント連携 🔴

- [ ] https://vercel.com にログイン
- [ ] GitHub リポジトリを連携 (先に GitHub に push)
- [ ] Vercel プロジェクト作成
- [ ] 環境変数を Settings > Environment Variables に設定:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - (SERVICE_ROLE_KEY はここには置かない、Supabase Edge Function 側に置く)

### HC-P5-02: Cron 設定の承認 🟡

- [ ] Vercel Cron (vercel.json) または GitHub Actions の Cron 設定を確認
- [ ] 実行頻度が過剰でないか (推奨: 1 日 1 回)
- [ ] 初回デプロイ後、24 時間待って Cron が動いたことを Supabase の sync_logs で確認

### HC-P5-03: 本番デプロイ後の動作確認 🔴

- [ ] 本番 URL で以下を手動確認:
  - [ ] ログインできる
  - [ ] レパ一覧に自分のデータが表示される
  - [ ] レパ詳細が開ける
  - [ ] 履歴一覧が表示される
  - [ ] セトリを作成できる
  - [ ] 「取り込む」ボタンで同期できる
- [ ] Supabase のログで RLS が効いていることを確認

---

## Phase 6+: 拡張時のチェックポイント

### 音源解析機能の法的確認 🔴

将来実装時、以下を法務的に確認:

- [ ] ユーザーが「自分が所有する音源のみ」をアップロードすることを UI で明示
- [ ] 生成されるデータ (MIDI note 2 点) のみを保存し、ピッチコンター時系列は保存しない
- [ ] 音源ファイル自体は処理後に削除する

### マルチユーザー展開時のセキュリティ確認 🔴

個人用から公開サービス化する場合:

- [ ] songs テーブルの RLS 見直し (書き込み制限)
- [ ] Rate limiting の実装
- [ ] DAM API の規約再確認
- [ ] プライバシーポリシー・利用規約の整備
- [ ] GDPR / 個人情報保護法対応

---

## 自動化と人間介入の境界

### 自動化する範囲

| 領域 | 自動化度 |
|---|---|
| Schema 適用 | ✅ 完全 (psql で実行) |
| Next.js 初期化 | ✅ 完全 (create-next-app) |
| コード生成 | ✅ 完全 (Generator Agent) |
| テスト実行 | ✅ 完全 (Evaluator Agent) |
| リント・型チェック | ✅ 完全 |
| Lighthouse 計測 | ✅ 完全 |
| pixel diff チェック | 🟡 部分 (閾値で分岐) |
| API 属性名修正 | ✅ 完全 (show-xml → 修正 → 再実行ループ) |
| デザインの意図判断 | ❌ 人間のみ |
| 秘密情報の入力 | ❌ 人間のみ |
| Dashboard の UI 操作 | ❌ 人間のみ |
| 本番デプロイ承認 | ❌ 人間のみ |

### Escalation ルール

以下の状況では Agent が自動で人間に control を返す:

- 同じ Task を 3 回連続失敗
- 1 Phase で累計 20 回以上の再生成
- Schema 変更が必要と判断した場合 (schema.sql は読み取り専用扱い)
- 外部サービス (Supabase, Vercel, GitHub) の API 呼び出しエラーが 5 回連続
- 秘密情報が必要なタスク (cdmCardNo, password, API key の入力)
- `HC-*` で 🔴 Blocking とマークされたチェックポイント

### 人間が介入したら Agent に伝えること

人間が手動で作業を完了したら、Agent に以下の形式で伝える:

```
HC-P1-01 complete.
SUPABASE_URL: <url>
SERVICE_ROLE_KEY is set in .env
TARGET_USER_ID: <uuid>

Please proceed with P1-02.
```
