# Sync Performance Investigation — 2026-04-22

ユーザーからの質問:
> データ取り込みのロジックがとても時間がかかるので、短縮できないか調査。また、取り込みは定時バッチでサーバー側で行えないか。

## tl;dr

- **定時バッチは既に実装・稼働中**。`.github/workflows/sync-scores.yml` が 毎日 UTC 03:00 (JST 12:00) に動き、Supabase Edge Function を叩いて同期している。ユーザー操作は不要。
- **手動「取り込む」ボタン**が遅いのは主に **DAM 側のページングレイテンシ** + **50x5 = 200 件の逐次 POST → Supabase 書き込み** の単純な直列処理が原因。Edge Function の計算時間は小さい。
- **短縮できる箇所** は 3 点: (1) ページ取得の並列化、(2) DB 書き込みのバッチ化、(3) インクリメンタル同期 (全件舐めず最新 1-2 ページだけ)。実装工数は(3) が最小で効果大。

## 現在の動作

### データフロー

```
ユーザーのブラウザ ─┐
                  ├─→ Supabase Edge Function  ─→ DAM XML API (ページ 1-40)
GH Actions (cron) ─┘     (sync-scores)         ─→ XML パース
                                                ─→ Supabase DB (scores / songs / sessions)
```

### 各ステップの実測 (既存ログから推定)

| ステップ | 所要 | 根拠 |
|---|---|---|
| DAM fetch page (1 ページ 5 件) | ~1 秒 / page + 0.5 秒 throttle | `dam_client.ts` `REQUEST_INTERVAL_MS = 500` |
| 40 ページ分の合計 | **~60 秒** | 40 × 1.5 秒 ≒ 60 |
| XML parse (1 件) | <10 ms | fast-xml-parser、ローカル処理 |
| DB 書き込み (1 件 = songs upsert + scores insert + intervals insert) | ~300-500 ms | Supabase REST 3 回の RTT |
| 200 件 × 3 RTT | **~60-100 秒** | |
| **合計** | **~2 分** (全件同期時) | |

同期済み分は `dam_scoring_id` の unique 制約で INSERT が 23505 即返される → DB 書き込みは実質スキップになるが、DAM fetch は毎回全 40 ページを舐めている。

### 定時バッチは既に動作中 ✅

`.github/workflows/sync-scores.yml`:
```yaml
on:
  schedule:
    - cron: "0 3 * * *"   # 毎日 UTC 03:00 = JST 12:00
  workflow_dispatch:
```

GH Actions → `curl` で Edge Function に POST → DB 更新。ユーザーは放置していても **毎日お昼に同期される**。Discord webhook 未登録なら通知は無いが、`/settings/sync-logs` で結果確認できる。

## 短縮候補 (優先順位付き)

### 🥇 1. インクリメンタル同期 (工数 1h、効果最大)

**問題**: 毎回全 40 ページを舐めている。200 件全て同期済のケースでも 60 秒かかる。

**改善**: `scores` の最新 `dam_scoring_id` を事前に取得し、page 1 を取得した時点で **既知の id に到達したら打ち切る**。

典型的な日次 cron では新規 0-5 件のため、page 1 (5 件) の fetch で完了し **所要 ~1.5 秒** に短縮できる。

実装変更箇所:
- `sync-scores/sync.ts` で `runSync` の開始直前に既存 `scoring_ai_id` を最大 1 件取得
- `client.iterAll` を抜ける条件に「既知 id ヒット」を追加

既存の unique 制約によるスキップは DB 保険として残るので、誤検知 (古い記録が新しい id を持つケース) でも破綻しない。

### 🥈 2. DAM fetch のページ並列化 (工数 30 分、効果中)

**問題**: 40 ページ逐次。

**改善**: `Promise.all` で 5-10 ページ並列、throttle を `REQUEST_INTERVAL_MS` → ページ間 100ms に短縮。

DAM サーバーへの負荷とレート制限を考えるとやり過ぎはリスク。**並列度 3-5 くらい** が安全。フル同期時間を 60 秒 → 15-20 秒に短縮可能。

ただし (1) の後ではページ 1 のみ取得の日が大半のため、並列化の実効メリットは INIT 実行時のみ。

### 🥉 3. DB 書き込みのバッチ化 (工数 1-1.5h、効果中)

**問題**: 200 件を 1 件ずつ `INSERT` + `INSERT score_pitch_intervals` で合計 400 RTT 発生。

**改善**: `persistGroups` を書き換え、同一グループ内の `scores` と `score_pitch_intervals` をバルク INSERT (Supabase の `insert(arrayOfRows)`) に。`songs` upsert は既存重複判定があるので逐次必要だが、`.upsert(array)` でまとめられる。

効果: 200 件 × ~400ms = 80 秒 → **~3-5 秒**。

ただし、現状でも unique violation を個別検出している (skipped 判定) ので、バッチ化すると部分失敗ハンドリングが複雑に。インクリメンタル (1) と組み合わせると「1 件 2 件」しか書かない日が多くなり、バッチ化の恩恵は小さい。

### その他

- **Supabase Functions のリージョン**: US リージョンの場合 JP→US レイテンシで大きくなる。Supabase ダッシュボードで確認、JP リージョン (asia-northeast1) にプロジェクト作り直せば RTT 半減
- **Edge Function コールドスタート**: 初回呼出で数百 ms 余計にかかる。`--no-verify-jwt` なので warm はされやすい
- **raw_xml 書き込み**: 10KB x 200 = 2MB のペイロード、ネットワーク律速はそれほど大きくない

## 推奨実装順

1. **(1) インクリメンタル同期** — 日次 cron と手動ボタンどちらも高速化。日常の体感が大きく変わる
2. **(3) バッチ化** — INIT / バックフィル用
3. **(2) ページ並列化** — 余力があれば

## 現在の定時バッチの確認方法

1. GitHub → `usamaru123/karapke-report` → Actions タブ
2. "Daily DAM Sync" workflow を開く
3. 過去 runs の成功/失敗 を確認
4. Supabase 側の結果は アプリの `/settings/sync-logs` で見える

### 失敗通知を受けたい場合

`.github/workflows/sync-scores.yml` には既に `DISCORD_WEBHOOK_URL` シークレット対応が入っている。Discord サーバーで webhook URL を発行 → GitHub → Settings → Secrets and variables → Actions に `DISCORD_WEBHOOK_URL` として登録するだけ。

## 結論

**定時バッチは既に動いているので、サーバー側同期という要件は満たされている**。主な体感問題は**手動「取り込む」ボタン**の所要時間で、それは上記 (1) インクリメンタル同期で劇的に改善可能 (~60秒 → ~1-2 秒、日次 run では 99% のケースで)。

実装着手するか？ YES なら別 commit で `sync.ts` と `dam_client.ts` を改修可能。
