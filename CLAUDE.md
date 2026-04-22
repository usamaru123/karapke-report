# Repo-level notes for Claude Code / agents

アプリ固有の Next.js 規約は `karaoke-app/AGENTS.md` を参照。
このファイルは**リポジトリ全体**に関わる運用・デプロイ・注意点を記録する。

---

## 🔴 必須ルール: ロードマップと進捗を常に記録

**正典**: `docs/implementation-roadmap.md`

このリポジトリで agent / claude が作業する場合、**以下のタイミングで必ず
`docs/implementation-roadmap.md` の「Progress Log」セクションを更新する**:

### 更新トリガー

| タイミング | 記録内容 |
|---|---|
| 機能実装が完了した時 | 「完了」セクションに項目追加 (簡潔に 1-2 行、詳細は commit / 設計書へリンク) |
| 設計書を新規作成した時 | `docs/feature-design/<topic>.md` への参照を追加 |
| 新しい未着手タスクを識別した時 | 「未着手」セクションに行追加 (工数見積 + ブロッカー明記) |
| タスクがブロックされた時 | 「ブロック中」セクションへ移動 + 理由明記 |
| 既存ロードマップ項目が不要になった時 | 削除せず取り消し線付きで残す (判断経緯を残す) |
| セッション終了前 | 少なくとも「完了」「未着手」の差分をこのセッション分として追記 |

### 記録の形式

- 日付セクション (`### YYYY-MM-DD セッション`) を積む。**既存ログは書き換えない** (追記のみ)
- ✅ 完了 / ⚠️ 未着手 / 🟦 ブロック中 の 3 区分
- 1 項目 1-2 行、詳細は commit SHA or 設計書への参照で省力化
- 工数見積・ブロッカーを未着手側に明記 (読む側が優先判断できるように)

### なぜ必須にするか

セッションを跨いで作業する時、**何を終えた / 何が残っている / なぜ止まっている**が
1 ファイルで追える必要がある。これが無いと:

- 次セッションで同じ調査を重複実行する
- 完了済み機能を「未実装」と誤認して二重実装する
- 未着手項目の優先順位が消える

実際に本リポジトリでは、Phase 6 の「柱 B/C/D」分類を過去セッションで使ったのに
次セッションで再確認が必要になった。Progress Log があればそのロスを防げる。

### スキップして良いケース

- 単純な typo 修正、フォーマット調整、依存バージョン bump のみのコミット
- 1 セッションで始まり 1 セッションで完結する質問・ドキュメント修正

迷ったら**書く**。冗長な Progress Log は削れるが、失われた記録は戻らない。

---

## リポジトリ構造の注意

- Git root は `karaoke-handoff/karaoke-handoff/` (二重ディレクトリ)。
  上位の `C:/Users/shun/Projects/karaoke-report-web/` は git repo ではない。
- リモート: `https://github.com/usamaru123/karapke-report.git` (所有者 `usamaru123`)
- 本番 URL: `https://karapke-report.vercel.app` ( `karaoke-report` ではなく `karapke-report` )
- Vercel の build root は `karaoke-app/` (Next.js アプリ)

---

## デプロイ手順

**`main` に push → Vercel が自動デプロイ**。手動オペは原則不要。

### Pre-push チェックリスト

`karaoke-app/` で以下が全て通っていること:

```bash
cd karaoke-app
npm run type-check   # tsc --noEmit
npm run lint         # eslint
npm test             # vitest run
npm run build        # next build
```

特に `next build` は Vercel と同じ Turbopack が走るので、ここが通ればリモートでもビルドはほぼ成功する。

### コミット規約

- **メッセージは英語**、1 コミット 1 目的、conventional prefix (`feat:` 等) は使わない
- 既存ログ例:
  - `Phase 6 A3: recommend the best-scoring KEY per song`
  - `Fix /api/sync error surfacing: catch FunctionsHttpError throws`
  - `Advice engine: DAM Ai score diagnostics on repertoire detail`
- subject は短く、body に詳細を書く

### Push 認証のクセ (Windows GCM の罠)

**症状**: `git push origin main` が `403 denied to shun19991214` で失敗する。
`usamaru123` のはずなのに別アカウントがキャッシュされていて、資格情報マネージャーで消しても復活する。

**回避策**: リポジトリ root の `.env` (gitignored) にある `GITHUB_TOKEN` (PAT) を
URL に埋めて push。トークンを echo/log に残さないワンライナー:

```bash
cd karaoke-handoff/karaoke-handoff
TOKEN=$(grep '^GITHUB_TOKEN=' ".env" | cut -d= -f2- | tr -d '"' | tr -d "'" | tr -d '\r' | tr -d ' ')
git push "https://usamaru123:${TOKEN}@github.com/usamaru123/karapke-report.git" main
unset TOKEN
```

- コマンド履歴にトークンが平文で残らない
- `${TOKEN}` は shell 内でのみ展開される
- push 後は `unset TOKEN` で環境変数も消す

**根本対処 (未完了・時間ある時に)**:
1. `git config --list --show-origin | grep -iE "credential|user"` で設定源を特定
2. `printf "protocol=https\nhost=github.com\n\n" | git credential fill` で GCM が返す内容を確認
3. 必要なら GCM の store から `shun19991214` を erase

### Deploy 失敗時のトラブルシュート

| 症状 | 典型原因 | 対処 |
|---|---|---|
| `Type error:` | `types/database.ts` が DB スキーマとズレ | `npm run db:types` 再生成 or 手動で型追加 |
| `Module not found:` | import パスミス / `@/` alias 崩れ | `karaoke-app/tsconfig.json` の paths 設定確認 |
| Supabase 接続エラー | Vercel の env var 未設定 | Vercel dashboard → Settings → Environment Variables |
| Edge Function 404 | sync-scores が未再デプロイ | 下記「Edge Function デプロイ」参照 |

---

## 手動適用が必要なもの (Vercel では自動化されない)

### 1. DB マイグレーション

`sql/migrations/NNN_*.sql` に新規ファイルを置いた場合、**Supabase Dashboard の SQL Editor に paste して手動実行**が必要。
冪等に書かれているので再実行しても安全（`IF NOT EXISTS`, 既存埋まり判定で UPDATE スキップ など）。

### 2. Edge Function デプロイ (`supabase/functions/sync-scores/`)

`parser.ts` / `db.ts` / `index.ts` を変更した場合は Vercel では反映されない。別途:

```bash
supabase functions deploy sync-scores --no-verify-jwt --project-ref <PROJECT_REF>
```

- `--no-verify-jwt`: browser から直接呼ぶ構成のため必要 (`FUNCTION_INVOCATION_TIMEOUT` 回避の設計)
- 失敗すると「次回同期からアプリ側も期待した新フィールドを受信しなくなる」ので、DB 列追加とセットで実行

### 3. GitHub Actions secrets

`.github/workflows/sync-scores.yml` の `DISCORD_WEBHOOK_URL` などを使う場合、
GitHub → Settings → Secrets and variables → Actions で登録。

---

## Secrets 管理

### Gitignored (コミット禁止・`.gitignore` で保護済)

- `/.env` (リポジトリ root、全スクリプトと PAT 用の共通シークレット格納)
- `karaoke-app/.env*.local`
- `karaoke-app/.env`

### `.env` の想定キー

`.env.example` (コミット対象) にテンプレ。実際の値は手動で埋める。主要キー:

- DAM: `DAM_CDM_CARD_NO`
- Supabase: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, `SUPABASE_ACCESS_TOKEN`
- ユーザー: `TARGET_USER_ID` (scores を紐付ける auth.users の UUID)
- CI: `GITHUB_TOKEN` (git push / GitHub Actions 用)
- RLS テスト: `USER_B_EMAIL`, `USER_B_PASSWORD`, `USER_B_UUID`
- ランタイム: `SESSION_GAP_HOURS`, `LOG_LEVEL`

### 絶対にコードに書かない

- DAM `cdmCardNo` (base64 エンコード済でも個人識別子)
- Supabase `service_role` key
- GitHub PAT (`ghp_...`)
- Discord webhook URL

### チェック方法

Push 前に以下を実行し 0 件を確認:

```bash
grep -rE 'ghp_[A-Za-z0-9]{36}|sk-[A-Za-z0-9]{40}|eyJhbGci' --include="*.ts" --include="*.tsx" --include="*.py" karaoke-app supabase scripts
```

---

## リポジトリ横断の現状メモ

- **アドバイスエンジン** (DAM 採点診断) は Stage S4 まで完了。S2b/S2c/S2d/S3 は未着手。設計書: `docs/feature-design/advice-engine.md`
- **Ai Heart 対応**: 別エンドポイント (`GetScoringHeartListXML.do` 等) 未調査、R01 は `scoring_type='ai'` 限定
- **Vitest 基盤**: `karaoke-app/vitest.config.mts`。純粋ロジックのみカバー、jsdom / React Testing Library は未導入
- **認証まわりの既知の不備**: Windows GCM に `shun19991214` 資格情報が残存。通常は PAT 埋め込み方式で回避中
