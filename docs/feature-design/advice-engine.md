# スコア向上アドバイス機能 設計書

最終更新: 2026-04-22
ステータス: **設計ドラフト（未承認）**

---

## 1. 目的

ユーザーの採点履歴から「次に何を練習すれば点が上がるか」を診断し、曲単位と総合の 2 レイヤーで助言を提示する。単なる点数ビューではなく、**DAM 精密採点 Ai / Ai Heart のスコアリング構造の知見に基づいた定量診断**を行う。

## 2. 対象範囲

| スコア種別 | 対応優先度 | 理由 |
|---|---|---|
| 精密採点 Ai (`scoring_type='ai'`) | 高 | 実測データ・有志知見が最も蓄積 |
| 精密採点 Ai Heart (`'ai_heart'`) | 中 | 2025/04 リリースで聴感・ハート未解析領域多し。基本ロジックを流用 + 注釈で開始 |
| DX-G / DX (`'dxg','dx'`) | 低 | 過去データ閲覧のみ、アドバイス対象外 |

## 3. 前提（Stage 0 + Stage 0.5 で実データ検証済み: 2026-04-22）

### 検証方法

1. ユーザーが Supabase SQL Editor で `raw_xml` を 1 件目視 → 40+ フィールド確認
2. `GetScoringAiListXML.do?cdmCardNo=...&pageNo=1&detailFlg=1` を curl → 5 レコード分を Python で走査、**全 137 フィールドを一覧化**

### Q1: raw_xml のフィールド有無

**✅ 存在確認済み (主要42フィールド)**: `intonation`, `kobushiCount`, `shakuriCount`, `fallCount`, `vibratoCount`, `vibratoTotalSecond`, `vibratoType`, `vibratoSkill`, `longtoneSkill`, `accentCount`, `hammeringOnCount`, `edgeVoiceCount`, `hiccupCount`, `aiSensitivityMeterAdd/Deduct/Points`, `aiSensitivityGraphAddPointsSection01..24`, `aiSensitivityGraphDeductPointsSection01..24`, **`aiSensitivityGraphIndexSection01..24`**, **`intervalGraphIndexSection01..24`**, `timing`, `intervalGraphPointsSection01..24`, **`maxTotalPoints`**, **`nationalAverage*`** x6, `analysisReportCommentNo`, `damserial`, `dataKind`, `favorite`, `entryCount`, `fadeout`, `scoringEngineVersionNumber`(空)

### ❌ 音程正確率について（Stage 0.5 で追加検証）

**独立フィールドは raw_xml に存在しない。** 全 137 フィールドのスキャンで `pitchAccuracyRate` / `pitchHitRate` 相当は発見できず。

- 代替候補は `radarChartPitch` (0-100 スケール) だが、**24 区間ポイントの単純平均ではない**ことを実測で確認:
  - 例: サンプル 1 では `radarChartPitch=83`, 24 区間平均=76.67, B'01 区間平均=81.0, B'10 区間平均=76.0 → **どの集計も 83 に一致しない**
  - DAM 内部で何らかの重み付け処理をした後の値
- DAM UI の結果画面に表示される「音程正確率 XX%」と `radarChartPitch` が厳密同義か**確証なし**
- **R03 の扱い更新**: 実装は残すが、source=`inferred` / confidence=`low` に変更し、UI に **「DAM UI の『音程正確率 %』とは異なる可能性あり」** と明記する。95 を閾値にする挙動はナレッジの経験則と合致するが、ユーザーに「推定」と伝える責任を果たす

### ⚠️ `vibratoType` は 2 桁数値コード

アルファベット文字列ではなく数値 (`"10"`, `"2"`, `"13"`, `"1"` 等)。§3.1 に解読結果。

### Q2: Ai Heart ハートボーナス（別エンドポイント）

**今回取得の 5 件は全て `scoring_type='ai'`**。`GetScoringAiListXML.do` は精密採点 Ai 専用エンドポイント。Ai Heart は別エンドポイント (`GetScoringHeartListXML.do` 等、未確認) が必要で、別ワークとして後回し。**R01 は `scoring_type='ai'` 限定で先行実装**。

### Q3: 24 区間データの存在率

**detailFlg=1 なら確実に全 24 区間取れる** — 5 件全てで `intervalGraphPointsSection01..24` と `aiSensitivityGraph*Section01..24` がフル populate 。既存パーサも detailFlg=1 前提なので問題なし。

### 3.1 vibratoType 数値コードの解読（Stage 0.5 結果）

5 レコード観測値:

| scoringAiId | vibratoType | skill | 総秒 | 回数 |
|---|---:|---:|---:|---:|
| 2634160 | **10** | 3 | 20 | 9 |
| 2634148 | **2** | 5 | 33 | 10 |
| 2634135 | **13** | 0 | 7 | 1 |
| 2634126 | **1** | 5 | 20 | 5 |
| 2634077 | **13** | 6 | 41 | 12 |

**仮説 (confidence: medium)**: 1-indexed で 15 種類マッピング:

| 数値 | 分類 | 数値 | 分類 | 数値 | 分類 |
|---:|---|---:|---|---:|---|
| 0 | N（未検出、1秒未満）| 5 | B-2 | 10 | **D** (非ボックス) |
| 1 | **A-1** (速く浅) | 6 | B-3 (推奨) | 11 | E |
| 2 | **A-2** | 7 | C-1 | 12 | F |
| 3 | A-3 | 8 | C-2 | 13 | **G** |
| 4 | B-1 | 9 | C-3 (推奨) | 14 | H |

根拠:
- 観測値が 1..13 に収まり、ナレッジの「全 15 種」と整合
- type=13 が skill=0/6 両方に出現 → ナレッジ「G は B-3 のボックス失敗型、形状で判定・持続で skill」と矛盾なし
- type=1/2 (A 系ちりめんビブ) に skill=5 が付く → ちりめんビブでも長秒で高 skill は矛盾なし

**残存不確実性**:
- N (未検出) が 0 or 15 のどちらかは未確認
- 全 200 件を取得して分布を見れば精度向上可能 (未実施)
- **対応**: `lib/advice/vibrato-type-map.ts` に仮説マッピングを書き、ユニットテストは「仮説と整合する入力→出力」を固定。将来の実証で書き換え可能にする

### 3.2 🆕 想定外の発見

#### maxTotalPoints の意味（未確定）

5 件観測:

| id | total | max | 差分 |
|---|---:|---:|---:|
| 2634160 | 90.298 | 94.109 | +3.811 |
| 2634148 | 92.028 | 94.557 | +2.529 |
| 2634135 | 66.032 | 92.668 | **+26.636** |
| 2634126 | 88.333 | 92.097 | +3.764 |
| 2634077 | 89.516 | 92.213 | +2.697 |

- 全件で `total < max` → 「到達可能上限」仮説は崩れていない
- ただし `id=2634135` の差分 26 は「同歌唱で全技法完璧なら達成できる上限」寄りの可能性
- **単独レコードから意味確定は困難** → R13 は Stage 2d で**別曲の複数歌唱サンプルを比較してから実装判断**

#### 🆕 `aiSensitivityGraphIndexSection01..24` / `intervalGraphIndexSection01..24` 発見 (48 フィールド)

値は `"B'01"` / `"B'10"` の 2 値フラグで 24 区間に割り当て。今回サンプルの配置:

```
区間 01-06: B'01  (前奏?)
区間 07-10: B'10  (Aメロ?)
区間 11-17: B'01  (Bメロ?)
区間 18-24: B'10  (サビ?)
```

**推定**: メロディセクション識別フラグ (サビ/A/B の 2 値? メロディの音程レンジ区分? )

**新ルール R14 追加**: 区間スコアとセクションフラグを組み合わせ「**サビ（B'10 区間）の音程が弱い**」等の意味あるラベルで提示。ただし B'01/B'10 の解釈は**要検証**で、判明までは「区間 N 群 / M 群」の抽象ラベルに留める。

### 3.3 現状 parser.ts の取りこぼし

**137 フィールド中、既存 parser.ts が抽出しているのは約 30 のみ**。残りは全て `raw_xml` JSONB 内に埋もれている。S1 実装では DB 列追加を最小限にし、`lib/advice/raw-xml-extract.ts` で on-the-fly 読み出しする方針を推奨 (§9 参照)。

## 4. 知見サマリ（根拠別 3 ラベル運用）

アドバイスを生成する各ルールに `source` ラベルを付け、UI でも表示する。ユーザーがロジックの確度を判断できるようにする。

| ラベル | 意味 | 例 |
|---|---|---|
| `official` | 第一興商の公式発表・特許で明文化 | ビブラート判定窓 500ms, 140–300ms 周期 / キー変更は減点対象外 |
| `empirical` | 有志スコアラー実測値（複数ソース一致） | 音程 95% 超で約 0.23 点減点、Ai感性ボーナス実測最大 6.673 |
| `inferred` | 単独ソース or 推定 | 抑揚→表現力上限式 y=0.25x+78 (こじがみさま) |

## 5. データ要件

### 5.1 既に保存済みで即使えるもの

| フィールド | 用途 |
|---|---|
| `total_score` | 総合点 |
| `pitch_score` / `stability_score` / `expression_score` / `vibrato_longtone_score` / `rhythm_score` | レーダー 5 軸 → ボトルネック診断 |
| `ai_bonus` | 素点分解、ボーナス過依存診断 |
| `key_control` | 既存 `recommendKey` と統合 |
| `singing_range_*` / `vocal_range_*` | 既存 `evaluateVocalRange` と統合 |
| `pitch_intervals` (SMALLINT[24]) | 区間弱点診断（`score_pitch_intervals` テーブル） |
| `raw_xml` (JSONB) | 下記追加フィールドの抽出元 |
| `scoring_type` | Ai / Ai Heart 分岐 |

### 5.2 追加抽出が必要なもの（Stage 1 で parser 拡張）

| フィールド | 型 | 保存先候補 |
|---|---|---|
| `intonation` | SMALLINT (0–100) | `scores.intonation` 列追加 |
| `kobushi_count` / `shakuri_count` / `fall_count` / `vibrato_count` / `accent_count` / `hammering_count` / `edge_voice_count` / `hiccup_count` | SMALLINT | 別テーブル `score_technique_counts` (score_id PK) として分離推奨（大半の Ai スコアで null の可能性、列数肥大回避） |
| `vibrato_total_second` | NUMERIC | 同上 |
| `vibrato_type` | TEXT ("B-3" 等) | 同上 |
| `vibrato_skill` / `longtone_skill` | SMALLINT | 同上 |
| `pitch_accuracy_rate` | NUMERIC(5,2) | `scores.pitch_accuracy_rate` 列追加 |
| `ai_sensitivity_add_intervals` / `_deduct_intervals` | SMALLINT[24] | `score_pitch_intervals.details` JSONB に格納（既存カラム） |

### 5.3 設計判断: DB 列追加 vs on-the-fly 読み出し（Stage 0.5 後に方針変更）

**変更後の方針**: **原則として DB 列追加は最小限、`raw_xml` JSONB からの on-the-fly 読み出しを優先**

| 理由 | 詳細 |
|---|---|
| 追加フィールドが 100+ 個ある | `intonation`, 技法カウント 8 種, Ai 感性 Meter 3 軸, 全国平均 6 軸, `maxTotalPoints`, Interval/AiGraph の 24x4=96 フィールドなど。全部 DB 列化するとスキーマが肥大 |
| 既存 200 件の再パース不要 | `raw_xml` は JSONB で既に全部持っている。読み出し関数を書くだけで即座に診断可能 |
| 閾値・マッピング変更時の手戻りゼロ | `vibratoType` マッピングが変わっても DB 変更不要、関数を書き換えるだけ |
| JSONB のインデックスは後付け可能 | 集計で特定フィールドが頻繁にクエリされるなら後から GIN index を張れる |

**例外 (DB 列追加する項目)**:
- `intonation` → R02 の主入力で、曲単位の集計クエリで使う可能性 → `scores.intonation SMALLINT` を追加
- `maxTotalPoints` → R13 の主入力、意味確定後に追加判断

**その他は `lib/advice/raw-xml-extract.ts` で抽出**:
```ts
export function extractTechniqueCounts(rawXml: unknown): TechniqueCounts { ... }
export function extractVibratoMeta(rawXml: unknown): VibratoMeta { ... }
export function extractAiSensitivityGraph(rawXml: unknown): AiSensitivityGraph { ... }
export function extractMelodySectionFlags(rawXml: unknown): SectionFlag[] { ... }
export function extractNationalAverage(rawXml: unknown): NationalAverage { ... }
```

純粋関数化することで Vitest 単体テストが容易。

## 6. 診断ルール一覧（実装単位）

各ルールは**純粋関数**として実装し、ユニットテスト必須。Rule → Finding インターフェースで統一。

```ts
type Finding = {
  ruleId: string;              // "score-bonus-split"
  severity: "info" | "tip" | "warn";
  title: string;               // "ボーナス依存度が高い"
  message: string;              // 具体的な助言
  metrics: Record<string, number>;  // UI 表示用の数値根拠
  source: "official" | "empirical" | "inferred";
  confidence: "low" | "medium" | "high";
};
```

### 6.1 単発スコア診断（1 score → N findings）

| ID | ルール | Source | 入力 | 出力条件 |
|---|---|---|---|---|
| `R01` 素点/ボーナス分解 | `empirical` | `total_score`, `ai_bonus` | 素点 > 95 → 「ボーナス減衰ゾーン」warn<br>素点 < 85 & ボーナス > 5 → 「ボーナス過依存」tip |
| `R02` 抑揚ボトルネック | `inferred` | `intonation`, `expression_score` | 抑揚 80+ で `expression_score` が `0.25·intonation + 78 ± 0.5` に張り付いている → 「抑揚を上げれば表現力も上がる」 |
| `R03` 音程スイートスポット | `inferred` / **confidence: low** | `radarChartPitch` (= `scores.pitch_score`) | > 95 → 「音程過剰ゾーン — 95 超は減点反転の可能性 (∀ε氏経験則)」warn<br>< 85 → 「音程精度に伸びしろ」tip<br>**注意**: `radarChartPitch` は 24 区間音程の単純平均ではなく DAM 内部処理済スコア。DAM UI の「音程正確率 %」と厳密に等価か未確定。UI で「この指標は DAM の『音程正確率』と異なる可能性あり（推定）」と明示 |
| `R04` レーダー最弱軸 | `empirical` | 5 軸 | 最低軸が他軸 - 5 以上離れている → 「まず X を底上げ」tip |
| `R05` ビブラート型 | `official`+`empirical` | `vibrato_type`, `vibrato_skill`, `vibrato_total_second` | A 系 or N 型 → 「より遅く深く (B-3/C-3 目標)」tip<br>total_second < 5s → 「持続不足」warn |
| `R06` リズム走り/タメ | `empirical` | `rhythm_score` | < 90 → 「Ai は走り判定になりやすい、少しタメ気味に」tip |
| `R07` 技法単調性 | `empirical` | 技法カウント群 | 使われた技法種類数 ≤ 2 → 「技法バリエーションを増やす」tip |
| `R08` 24 区間音程弱点 | `empirical` | `pitch_intervals` | 最低区間が全体平均より 15+ 低い → 「曲の X/24 区間で音程が大きく崩れている」tip |
| `R09` キー適合性 | `empirical` | 既存 `evaluateVocalRange` 結果 | `hard` or `key_tweak` verdict → 「キー調整を検討」tip |
| `R10` 100 点ルーレット注記 | `official` | `scoring_type='ai_heart'` & `total_score >= 99.95` | info 表示「99.95 以上は二段階抽選。100.000 は約 0.3%」|
| **`R11` Ai 減点区間** 🆕 | `empirical` | `aiSensitivityGraphDeductPointsSection01..24` (raw_xml から) | 最大減点区間 > 30 → 「区間 X で Ai 感性減点が顕著。該当箇所を聞き直して原因特定」tip |
| **`R12` 全国平均比較** 🆕 | `empirical` | `nationalAverage*` (raw_xml から) | 自スコアの軸 < 全国平均 - 5 → 「この項目は平均以下。底上げの伸びしろ大」tip<br>> 全国平均 + 10 → 「得意」info |
| **`R13` 曲天井接近** 🆕 | `inferred` | `maxTotalPoints` (要検証、raw_xml から) | `(maxTotalPoints / 1000) - total_score < 1.0` → 「この曲のほぼ天井。別曲でスコア伸長を」info。ただし `maxTotalPoints` の正確な意味が要検証なので **Stage 2 後半で実装** |
| **`R14` メロディセクション区分** 🆕 | `inferred` | `aiSensitivityGraphIndexSection01..24` (B'01/B'10) | R08/R11 の出力文言で「区間 20」→「サビ相当区間 (B'10)」のようにセクション名で提示。ただし B'01/B'10 の意味解釈が未確定なうちは**抽象ラベル「セクション A/B」**に留める |

### 6.2 集計診断（N scores → 総合 findings）

| ID | ルール | 入力 | 出力条件 |
|---|---|---|---|
| `R20` 推奨キー | 既存 `recommendKey` 結果 | `kind='recommended'` → そのキーで伸びしろ明示 |
| `R21` 伸び悩み項目 | 直近 10 回のレーダー軸平均 | 最低軸が直近で変動しない → 「N 回連続で X が天井」warn |
| `R22` 改善トレンド | 同曲の直近 5 回 vs それ以前 5 回 | 総合点 +1 以上 → 「X 点上がった」info |
| `R23` 逆相関診断 | 全履歴で 素点 × ボーナス 散布 | 回帰係数が強負 → 「現在のフェーズはボーナスで稼ぐより素点調整が効く」tip |
| `R24` 得意曲 vs 苦手曲 | 曲ごと best_score | 最高曲と最低曲の差 > 10 点 → 「X で覚えたコツを Y に転用」info |

### 6.3 除外 / 保留ルール

- **「素点」の算出は Ai / Ai Heart で定義が変わる可能性**。Ai は `素点 = total - ai_bonus` で通るが、Ai Heart のハートボーナスが `ai_bonus` 列と同じかは未検証（§3 Q2）。不明なうちは **R01 を `scoring_type='ai'` 限定**で実装。
- **聴感（Ai Heart のみ）** は 2026/04 時点で有志解析途上。今回はスコープ外、注記 info のみ。
- **Ai 感性「青化」判定**: XML から取得可能か未確認、保留。

## 7. アーキテクチャ

```
scores (+ raw_xml)
  ↓ parser 拡張 (Stage 1)
scores + score_technique_counts
  ↓
lib/advice/
  ├─ types.ts          Finding / AdviceInput の型
  ├─ thresholds.ts     全マジックナンバーを集約 (将来較正可能)
  ├─ rules/
  │    ├─ score-bonus-split.ts      (R01)
  │    ├─ intonation-ceiling.ts      (R02)
  │    ├─ pitch-sweet-spot.ts        (R03)
  │    ├─ radar-weakest-axis.ts      (R04)
  │    ├─ vibrato-type.ts            (R05)
  │    ├─ rhythm-timing.ts           (R06)
  │    ├─ technique-variety.ts       (R07)
  │    ├─ interval-weak-segment.ts   (R08)
  │    ├─ key-fitness.ts             (R09)  -- 既存 evaluateVocalRange を再利用
  │    ├─ heart-roulette-note.ts     (R10)
  │    ├─ aggregate-trend.ts         (R21-R24)
  │    └─ aggregate-key-recommend.ts (R20)  -- 既存 recommendKey を再利用
  ├─ diagnose-score.ts     単発ルールを集約して Finding[] を返す
  └─ diagnose-history.ts   集計ルール
  ↓
app/(app)/repertoire/[id]/page.tsx        単発 + 曲集計アドバイス
app/(app)/page.tsx (ダッシュボード)         総合アドバイス TOP3
```

各ルールは**独立した純粋関数**で、**Vitest テストで境界値を固定**する。閾値は `thresholds.ts` から引き、テスト側もそれを参照する。

## 8. UI 設計

### 8.1 曲詳細ページ
`/repertoire/[id]` に新セクション **「アドバイス」** を追加。
- 最新スコア単発診断（R01-R10）
- 曲集計（R20-R24）
- Finding を severity 順でソート、上位 3〜5 件をカード表示
- 各カードに `source` ラベル（バッジ）と「詳細」展開（数値根拠を表示）

### 8.2 ダッシュボード
新 Card **「次のレッスン」** を SyncCard の上に追加。
- 全履歴の集計診断から severity 上位 1 件のみ表示
- タップで「曲を特定 → 曲詳細へジャンプ」
- スコアが 3 件未満なら「データ不足」の空状態

### 8.3 信頼度の可視化
公式 / 実測 / 推定 のバッジ色:
- 🟢 official: neon-green
- 🟡 empirical: neon-amber
- 🔵 inferred: neon-cyan（「推定」ラベル明示）

## 9. 実装段階化（Stage）

| Stage | 内容 | 工数 | ブロッカー |
|---|---|---|---|
| ✅ **S0** サンプル検証 | raw_xml 1 件を SQL Editor で確認し §3 Q1-Q3 を解決 | 30 分 | **完了 2026-04-22** |
| ✅ **S0.5** 追加検証 | DAM API を curl で直接叩き全 137 フィールド + vibratoType 分布取得 | 30 分 | **完了 2026-04-22** |
| **S1** 抽出関数ライブラリ + 最小マイグレーション | `lib/advice/raw-xml-extract.ts` を純粋関数で実装 (technique counts / vibrato meta / ai sensitivity graph / melody section flags / national average), Vitest で型と境界値テスト。DB は `scores.intonation SMALLINT` のみ追加し parser.ts を 1 行拡張 | 2h | S0.5 |
| **S2a** ルールエンジン 単発 基礎 (R01,R02,R04,R06,R09,R10) | 純粋関数 + Vitest | 2h | S1 |
| **S2b** ルールエンジン 単発 技法系 (R05,R07,R11,R12,R14) | 同上 + `lib/advice/vibrato-type-map.ts` | 2h | S1 |
| **S2c** ルールエンジン 区間系 (R08) | 同上 | 1h | S1 |
| **S2d** R03 + R13 (要検証系) | R03 は confidence=low で実装、R13 は `maxTotalPoints` 追加検証後 | 1.5h | S1 |
| **S3** ルールエンジン（集計 R20-R24） | 既存 `recommendKey` と統合 | 2h | S2a |
| **S4** UI（曲詳細） | AdviceSection コンポーネント, `source`/`confidence` バッジ | 2.5h | S2a+ |
| **S5** UI（ダッシュボード） | NextLessonCard | 1h | S3 |
| **S6** フィードバック収集 | Finding に 👍/👎 を付けるだけの簡易 log（閾値較正用の素材集め） | 2h | S4 |
| **合計** | | **16-17h** | |

## 10. 批判的レビュー（この設計への反論）

| 論点 | リスク | 緩和策 |
|---|---|---|
| **閾値がユーザー個人に合わない可能性** | ∀ε 氏らの実測は上級者中心。初級者では式が当てはまらない | S6 でフィードバック収集 → 将来的にパーソナライズ |
| **「アドバイス」は外れるとむしろ信頼失墜** | Finding を多く出しすぎると雑音 | 上位 N 件制限 + `severity` ガード + `source` ラベルで「推定」を明示 |
| **Ai Heart のハートボーナス構造未解明** | R01 が誤診断する可能性 | scoring_type='ai' 限定で開始、Heart は後日対応 |
| **raw_xml に想定フィールドが無い** | 実装してから空データで詰む | **Stage 0 で実データ確認を必須化** |
| **マイグレーションで既存 200+ 件の再パースが必要** | ダウンタイム / 整合性リスク | パーサ変更は「次回同期から適用、過去分は raw_xml 参照で on-the-fly 解析」も選択肢 |
| **100 点ルーレット注記 (R10) は心理的に逆効果？** | 「運だから頑張っても無駄」と誤解される恐れ | 文言を「99.95 以上は到達済。100.000 は運要素」と限定的に |
| **スコープが大きすぎる** | 12-14h はセッション 1 回で終わらない | Stage ごとに区切り、各 Stage の完了で走査可能 |

## 11. 実装しない判断の項目

- **ピッチバー（bar-by-bar）軌跡の可視化** — API で取得不可（ナレッジ §6 明記）
- **音源解析による音域推定** — Phase 6+「より先の将来」、別ワークストリーム
- **競合他ユーザとの比較** — 個人利用が前提、ソーシャル要素は「要慎重検討」扱い

## 12. 次のアクション（承認待ち）

1. **この設計書のレビュー** — 粒度・ルール選定・段階分けは妥当か
2. **Stage 0 の実行** — raw_xml 1 件を SQL Editor で取得 → §3 Q1-Q3 回答
3. **Stage 1 から順次着手の承認**

---

## 参考

- ユーザー提供ナレッジレポート「DAM 精密採点 Ai / Ai Heart 完全解析」(2026-04-22)
- ∀ε 氏「ボナカン編」(voish.net)
- こじがみさま 氏実測ログ
- 第一興商 特許 JP2008015213A (ビブラート検出)
- 既存コード: `supabase/functions/sync-scores/parser.ts`, `sql/schema.sql`
- 既存ロジック流用対象: `lib/key-recommendation.ts`, `lib/vocal-range.ts`
