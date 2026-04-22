/**
 * Centralized magic-number threshold values used by the advice engine rules.
 *
 * Every number here has a citation: knowledge-report knowledge (∀ε氏 / こじがみ
 * さま 氏 ら有志スコアラー実測) or a reasonable default. When rules fire too
 * aggressively / quietly, tune here — do NOT scatter numbers back into
 * rule files.
 */

// ---------------------------------------------------------------------------
// R01 素点/ボーナス分解
// ---------------------------------------------------------------------------

/**
 * 素点 (total - ai_bonus). The "Ai sensitivity ボーナス" diminishes as 素点
 * rises. ∀ε et al. observe ボーナス頭打ちが 素点 95 前後から顕著。
 */
export const BASE_SCORE_BONUS_DIMINISHING = 95;
/** 素点 < 85 かつ ボーナス > 5 → ボーナス過依存の目安。 */
export const BASE_SCORE_BONUS_OVERDEPENDENT_LOW = 85;
export const BONUS_OVERDEPENDENT_HIGH = 5.0;

// ---------------------------------------------------------------------------
// R02 抑揚 → 表現力上限 (こじがみさま式)
// ---------------------------------------------------------------------------

/**
 * y = 0.25 * intonation + 78 (抑揚 80 以上の近似式)
 * この式は intonation ≥ 80 でのみ成立。intonation < 80 では誤差大につき
 * R02 を適用しない。
 */
export const INTONATION_FORMULA_VALID_AT = 80;
export const INTONATION_FORMULA_SLOPE = 0.25;
export const INTONATION_FORMULA_INTERCEPT = 78;
/** 算出上限 vs 現 expression の差がこれ以下なら「天井張り付き」判定。 */
export const INTONATION_CEILING_STICK_EPSILON = 1.5;

// ---------------------------------------------------------------------------
// R04 レーダー最弱軸
// ---------------------------------------------------------------------------

/** 最弱軸が他軸平均から N 以上離れていれば「ボトルネック」。 */
export const RADAR_WEAKEST_GAP = 5;

// ---------------------------------------------------------------------------
// R06 リズム走り/タメ
// ---------------------------------------------------------------------------

/** リズムスコアがこれ未満で「走り気味」警告。knowledge §5 で <90 が典型。 */
export const RHYTHM_SCORE_TIP_BELOW = 90;

// ---------------------------------------------------------------------------
// R10 100点ルーレット注記 (Ai Heart)
// ---------------------------------------------------------------------------

/** Heart での 99.95 以上は二段階ルーレットの対象。 */
export const HEART_ROULETTE_FLOOR = 99.95;
