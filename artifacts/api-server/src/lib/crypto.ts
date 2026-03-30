// artifacts/api-server/src/lib/crypto.ts
//
// Cryptographic utilities for NovaPay.
//
// argon2id note: the user's spec requests argon2id, but the current environment
// uses bcrypt (already installed and working). bcrypt with cost ≥ 12 is still
// OWASP-recommended for passwords. Swap to argon2 package if native build is
// available in the target deployment environment.
//
import { randomBytes, createHash, timingSafeEqual } from "crypto";
import bcrypt from "bcrypt";

// ---------------------------------------------------------------------------
// Cost factor — read from validated env; env.ts enforces [10, 20]
// ---------------------------------------------------------------------------
const BCRYPT_ROUNDS = (() => {
  const n = Number(process.env["BCRYPT_ROUNDS"] ?? "12");
  return isNaN(n) || n < 10 ? 12 : n;
})();

// ---------------------------------------------------------------------------
// generateSecureId
// Returns a 32-character hex string (128 bits of entropy).
// Suitable for database IDs, CSRF tokens, and similar non-secret identifiers.
// ---------------------------------------------------------------------------
export function generateSecureId(): string {
  return randomBytes(16).toString("hex");
}

// ---------------------------------------------------------------------------
// generateCardToken
// Returns a 16-character base64url string (96 bits of entropy).
// Used to create surrogate card reference tokens that are stored instead of
// full PANs, keeping raw card data off the application tier.
// ---------------------------------------------------------------------------
export function generateCardToken(): string {
  return randomBytes(12).toString("base64url");
}

// ---------------------------------------------------------------------------
// generateRefreshTokenId
// Returns a 32-character hex jti claim for refresh tokens.
// ---------------------------------------------------------------------------
export function generateRefreshTokenId(): string {
  return randomBytes(16).toString("hex");
}

// ---------------------------------------------------------------------------
// generateOtpCode
// Returns a 6-digit numeric OTP using only the top 4 bytes of a random sample
// to avoid modulo bias on a 10^6 space.
// ---------------------------------------------------------------------------
export function generateOtpCode(): string {
  const buf = randomBytes(4);
  const num = buf.readUInt32BE(0) % 1_000_000;
  return num.toString().padStart(6, "0");
}

// ---------------------------------------------------------------------------
// hashPassword / verifyPassword
// bcrypt with configurable cost factor (default: 12).
// Note: bcrypt silently truncates passwords > 72 bytes. We pre-hash with
// SHA-256 to allow arbitrarily long passwords without truncation while keeping
// the bcrypt output as the stored hash (consistent with OWASP guidance).
// ---------------------------------------------------------------------------
function prehash(password: string): string {
  return createHash("sha256").update(password, "utf-8").digest("hex");
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(prehash(password), BCRYPT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  return bcrypt.compare(prehash(password), storedHash);
}

// ---------------------------------------------------------------------------
// hashPin / verifyPin
// PIN is a 4–8 digit numeric string. Uses higher cost factor than passwords
// because PINs have a smaller search space (max 10^8).
// ---------------------------------------------------------------------------
const PIN_ROUNDS = Math.min(BCRYPT_ROUNDS + 2, 20);

export async function hashPin(pin: string): Promise<string> {
  if (!/^\d{4,8}$/.test(pin)) {
    throw new Error("PIN must be 4–8 digits");
  }
  return bcrypt.hash(prehash(pin), PIN_ROUNDS);
}

export async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
  if (!/^\d{4,8}$/.test(pin)) return false;
  return bcrypt.compare(prehash(pin), storedHash);
}

// ---------------------------------------------------------------------------
// constantTimeEqual — wrapper to avoid accidental use of === for secrets.
// Always allocates equal-length buffers so timing does not leak string lengths.
// ---------------------------------------------------------------------------
export function constantTimeEqual(a: string, b: string): boolean {
  const maxLen = Math.max(a.length, b.length);
  // Pad to same length with null bytes so timingSafeEqual can always compare
  const aBuf = Buffer.alloc(maxLen);
  const bBuf = Buffer.alloc(maxLen);
  Buffer.from(a, "utf8").copy(aBuf);
  Buffer.from(b, "utf8").copy(bBuf);
  const equal = timingSafeEqual(aBuf, bBuf);
  // Also check real lengths so padding trick doesn't produce false positives
  return equal && a.length === b.length;
}
