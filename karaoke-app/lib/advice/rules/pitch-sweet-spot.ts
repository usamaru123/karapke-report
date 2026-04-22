/**
 * R03: 音程スイートスポット 診断
 *
 * Source: inferred / confidence: low
 *
 * ナレッジ: 「音程正確率 95% 超で最大 0.23 点程度減点される (∀ε氏検証)」。
 *
 * raw_xml には `pitchAccuracyRate` 相当のフィールドが存在しない。DAM は
 * `radarChartPitch` (0-100) を返すが、これは 24 区間ポイントの単純平均では
 * なく、DAM 内部で処理された値であり、DAM UI に表示される「音程正確率 %」
 * と厳密に同義かは未確定 (§3 Q1 参照)。
 *
 * よってこのルールは pitch_score をベースとし、UI 側で「確度 低」の注釈を
 * 付けることで誤解を避ける。閾値挙動はナレッジの経験則と整合する。
 */

import { PITCH_SWEET_LOWER, PITCH_SWEET_UPPER } from "../thresholds";
import type { Finding, ScoreInput } from "../types";

export function evaluatePitchSweetSpot(score: ScoreInput): Finding[] {
  if (score.pitch_score === null) return [];

  if (score.pitch_score >= PITCH_SWEET_UPPER) {
    return [
      {
        ruleId: "R03.too_precise",
        severity: "warn",
        title: "音程過剰ゾーンかも",
        message:
          `音程スコア ${score.pitch_score} は 95 を超えています。有志実測では音程正確率 95% 超で約 0.23 点の逆減点が報告されています。` +
          `ただし DAM の「音程スコア」と UI 上の「音程正確率 %」が厳密に等価かは非公開なので、あくまで推定です。`,
        metrics: { pitch_score: score.pitch_score },
        source: "inferred",
        confidence: "low",
      },
    ];
  }

  if (score.pitch_score < PITCH_SWEET_LOWER) {
    return [
      {
        ruleId: "R03.pitch_room",
        severity: "tip",
        title: "音程精度に伸びしろ",
        message:
          `音程スコア ${score.pitch_score}。ガイドメロディオンでの音取り練習や、1/8 半音単位で意識する歌い方が効きます。`,
        metrics: { pitch_score: score.pitch_score },
        source: "inferred",
        confidence: "low",
      },
    ];
  }

  return [];
}
