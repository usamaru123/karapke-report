# Repo-level notes

Next.js アプリ固有の規約は `karaoke-app/AGENTS.md` を参照。ここは**リポジトリ横断**の最小限の運用ルールのみ。

## 必須: 進捗は `docs/implementation-roadmap.md` の Progress Log に記録

機能実装完了 / 設計書作成 / 未着手タスク識別 / ブロック発生 時は、同ファイル末尾の Progress Log に**追記**する（既存ログは書き換えない）。日付セクション (`### YYYY-MM-DD`) + ✅完了 / ⚠️未着手 / 🟦ブロック中 の 3 区分。typo や単発の質問はスキップで可。

## 構造の注意

- Git root は `karaoke-handoff/karaoke-handoff/`（二重ディレクトリ）
- リモート: `https://github.com/usamaru123/karapke-report.git`（所有者 `usamaru123`、URL は `karapke` と 1 文字違い）
- 本番: `https://karapke-report.vercel.app`、build root は `karaoke-app/`

## デプロイ

**`main` に push → Vercel 自動デプロイ**。

Pre-push 4 コマンド（`karaoke-app/` で）: `npm run type-check && npm run lint && npm test && npm run build`

コミット: **英語、conventional prefix なし**、既存ログ `git log --oneline` のスタイルを踏襲。1 コミット 1 目的。

### Push 認証

2026-04-22 に GH CLI の誤 account 認証を解除済 (`git config --global --unset-all credential.https://github.com.helper`)。通常の GCM (manager) 経由で `usamaru123` + PAT 入力プロンプトが出るはず。

もし過去のワークフローに戻したい場合、root `.env` の `GITHUB_TOKEN` を使った URL 埋め込み方式も動く:

```bash
TOKEN=$(grep '^GITHUB_TOKEN=' ".env" | cut -d= -f2- | tr -d '"' | tr -d "'" | tr -d '\r' | tr -d ' ')
git push "https://usamaru123:${TOKEN}@github.com/usamaru123/karapke-report.git" main
unset TOKEN
```

## Vercel で自動化されないもの

| 何 | 手順 |
|---|---|
| DB マイグレーション (`sql/migrations/*.sql`) | Supabase SQL Editor で paste して Run。全 migration は冪等前提 |
| Edge Function (`supabase/functions/sync-scores/`) | `supabase functions deploy sync-scores --no-verify-jwt --project-ref <REF>` |
| GitHub Actions secrets | GitHub → Settings → Secrets and variables → Actions で登録 |

## Secrets

- Gitignored: `/.env`（root、全 script と PAT 用）, `karaoke-app/.env*`
- キー定義は `.env.example` が一次ソース（CLAUDE.md では管理しない）
