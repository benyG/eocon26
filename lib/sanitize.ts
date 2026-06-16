// Lightweight sanitization for user-supplied strings.
// React escapes on render, so the goal here is to strip control characters,
// trim, and hard-cap length to prevent abuse / storage bloat / header injection.

// Strip ASCII control chars (0x00-0x1F except tab/newline/carriage-return, and 0x7F).
const CONTROL_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;
function stripControl(s: string): string {
  return s.replace(CONTROL_RE, "");
}

export function cleanText(input: unknown, maxLen = 500): string {
  if (typeof input !== "string") return "";
  return stripControl(input).trim().slice(0, maxLen);
}

// Returns the cleaned string, or null when empty (for optional DB columns).
export function cleanOptional(input: unknown, maxLen = 500): string | null {
  const v = cleanText(input, maxLen);
  return v || null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Returns a normalized email or null if invalid.
export function cleanEmail(input: unknown, maxLen = 254): string | null {
  const v = cleanText(input, maxLen).toLowerCase();
  return v && v.length <= maxLen && EMAIL_RE.test(v) ? v : null;
}

// Digits-only (with optional leading +) phone, capped.
export function cleanPhone(input: unknown, maxLen = 30): string | null {
  const raw = cleanText(input, 60);
  const v = raw.replace(/[^\d+]/g, "").slice(0, maxLen);
  return v || null;
}
