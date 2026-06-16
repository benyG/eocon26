import { scryptSync, randomBytes, timingSafeEqual, createHash } from "crypto";

// Password hashing with scrypt (memory-hard). Backward compatible with the
// legacy "salt:sha256hex" format so existing accounts keep working; callers
// should re-hash on successful login (see needsRehash).

const SCRYPT_KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(stored: string, password: string): boolean {
  if (!stored) return false;

  // New format: scrypt:salt:hash
  if (stored.startsWith("scrypt:")) {
    const [, salt, hashHex] = stored.split(":");
    if (!salt || !hashHex) return false;
    try {
      const computed = scryptSync(password, salt, SCRYPT_KEYLEN);
      const expected = Buffer.from(hashHex, "hex");
      return computed.length === expected.length && timingSafeEqual(computed, expected);
    } catch {
      return false;
    }
  }

  // Legacy format: salt:sha256hex (constant-time compare)
  const parts = stored.split(":");
  if (parts.length < 2) return false;
  const salt = parts[0];
  const storedHash = parts.slice(1).join(":");
  try {
    const computed = createHash("sha256").update(password + salt).digest("hex");
    const a = Buffer.from(computed, "hex");
    const b = Buffer.from(storedHash, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// True when the stored hash is not in the current (scrypt) format and should be
// upgraded after a successful login.
export function needsRehash(stored: string): boolean {
  return !stored.startsWith("scrypt:");
}
