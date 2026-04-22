/**
 * Pure validators for profile-related inputs. Extracted from server actions
 * so they can be unit-tested without spinning up Supabase. Keep this file
 * free of "use server" / next/* imports so Vitest can evaluate it in Node.
 */

export function validateDisplayName(input: string): string {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    throw new Error("表示名を入力してください");
  }
  if (trimmed.length > 40) {
    throw new Error("表示名は 40 文字以内にしてください");
  }
  return trimmed;
}

export function validateCdmCardNo(input: string): string {
  const trimmed = input.trim();
  if (trimmed.length < 10 || trimmed.length > 64) {
    throw new Error("カード番号の形式が正しくありません (10-64 文字)");
  }
  return trimmed;
}
