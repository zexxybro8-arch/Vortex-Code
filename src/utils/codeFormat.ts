/**
 * Redeem Code Formatting & Validation Utilities
 * 
 * Rules:
 * - 16-character normalized alphanumeric code (A-Z, 0-9)
 * - Full formatted display: "XXXX XXXX XXXX XXXX" (4 groups of 4)
 * - Masked display: "XXXX XXXX **** ****" (first 8 chars visible, last 8 masked)
 * - Validation: exactly 16 characters after removing spaces and dashes
 */

export function normalizeCode(raw: string): string {
  if (!raw) return '';
  return raw.replace(/[\s-]+/g, '').trim().toUpperCase();
}

export function isValid16Code(raw: string): boolean {
  const normalized = normalizeCode(raw);
  return normalized.length === 16 && /^[A-Z0-9]{16}$/.test(normalized);
}

export function validateCode(raw: string): { valid: boolean; normalized: string; error?: string } {
  const normalized = normalizeCode(raw);
  if (!normalized) {
    return { valid: false, normalized: '', error: 'Redeem code cannot be empty.' };
  }
  if (normalized.length !== 16) {
    return {
      valid: false,
      normalized,
      error: `Redeem code must contain exactly 16 characters (got ${normalized.length} characters). Example: ZRHS 35AC 7KLM 92PQ`,
    };
  }
  if (!/^[A-Z0-9]{16}$/.test(normalized)) {
    return {
      valid: false,
      normalized,
      error: 'Redeem code can only contain alphanumeric characters (A-Z, 0-9).',
    };
  }
  return { valid: true, normalized };
}

export function formatFullCode(raw: string): string {
  const norm = normalizeCode(raw);
  if (norm.length === 16) {
    return `${norm.substring(0, 4)} ${norm.substring(4, 8)} ${norm.substring(8, 12)} ${norm.substring(12, 16)}`;
  }
  // Fallback chunking by 4
  return norm.match(/.{1,4}/g)?.join(' ') || norm;
}

export function formatMaskedCode(raw: string): string {
  const norm = normalizeCode(raw);
  if (norm.length >= 8) {
    const part1 = norm.substring(0, 4);
    const part2 = norm.substring(4, 8);
    return `${part1} ${part2} **** ****`;
  }
  return 'CSGY AGTS **** ****';
}

export function generate16CharKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
