// artifacts/api-server/src/lib/jwt.ts
import { createHmac, randomBytes, timingSafeEqual } from "crypto";

// ---------------------------------------------------------------------------
// Secret bootstrapping — validated at startup via env.ts; this file relies on
// the same check but keeps a local reference so the module stays self-contained
// ---------------------------------------------------------------------------
const RAW_SECRET = process.env["JWT_SECRET"];

if (!RAW_SECRET || RAW_SECRET.length < 32) {
  if (process.env["NODE_ENV"] === "production") {
    throw new Error(
      "JWT_SECRET must be at least 32 characters. Refusing to start in production."
    );
  }
}

const SECRET = RAW_SECRET ?? "novapay-dev-fallback-secret-change-me-now";

// ---------------------------------------------------------------------------
// Token lifetimes
// ---------------------------------------------------------------------------
const ACCESS_TOKEN_TTL_SEC = 15 * 60; // 15 minutes
const REFRESH_TOKEN_TTL_SEC = 7 * 24 * 3600; // 7 days

// ---------------------------------------------------------------------------
// In-memory refresh-token store (keyed by jti).
// In production with multiple replicas, replace this map with a Redis SET.
// The interface is identical so the swap is a one-line import change.
// ---------------------------------------------------------------------------
interface RefreshEntry {
  userId: string;
  expiresAt: number; // Unix epoch seconds
}

const refreshStore = new Map<string, RefreshEntry>();

// Prune expired entries every 30 minutes to avoid unbounded growth
setInterval(() => {
  const now = Math.floor(Date.now() / 1000);
  for (const [jti, entry] of refreshStore) {
    if (entry.expiresAt <= now) refreshStore.delete(jti);
  }
}, 30 * 60 * 1000).unref();

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------
function b64urlEncode(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlDecode(str: string): string {
  const padded = str + "=".repeat((4 - (str.length % 4)) % 4);
  return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
    "utf-8"
  );
}

function sign(headerDotBody: string): string {
  return createHmac("sha256", SECRET)
    .update(headerDotBody)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// ---------------------------------------------------------------------------
// Public token shapes
// ---------------------------------------------------------------------------
export interface AccessTokenPayload {
  sub: string;  // userId
  email: string;
  jti: string;  // unique token id — allows per-token revocation if needed
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;  // stored in refreshStore for revocation
  iat: number;
  exp: number;
}

// ---------------------------------------------------------------------------
// signTokens — issues a fresh access + refresh token pair
// ---------------------------------------------------------------------------
export function signTokens(userId: string, email: string): {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
} {
  const now = Math.floor(Date.now() / 1000);
  const accessJti = randomBytes(16).toString("hex");
  const refreshJti = randomBytes(16).toString("hex");

  // --- Access token ---
  const accessPayload: AccessTokenPayload = {
    sub: userId,
    email,
    jti: accessJti,
    iat: now,
    exp: now + ACCESS_TOKEN_TTL_SEC,
  };
  const accessHeader = b64urlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const accessBody = b64urlEncode(JSON.stringify(accessPayload));
  const accessSig = sign(`${accessHeader}.${accessBody}`);
  const accessToken = `${accessHeader}.${accessBody}.${accessSig}`;

  // --- Refresh token ---
  const refreshPayload: RefreshTokenPayload = {
    sub: userId,
    jti: refreshJti,
    iat: now,
    exp: now + REFRESH_TOKEN_TTL_SEC,
  };
  const refreshHeader = b64urlEncode(JSON.stringify({ alg: "HS256", typ: "JWT", use: "refresh" }));
  const refreshBody = b64urlEncode(JSON.stringify(refreshPayload));
  const refreshSig = sign(`${refreshHeader}.${refreshBody}`);
  const refreshToken = `${refreshHeader}.${refreshBody}.${refreshSig}`;

  // Persist the refresh token's jti so we can revoke it later
  refreshStore.set(refreshJti, {
    userId,
    expiresAt: now + REFRESH_TOKEN_TTL_SEC,
  });

  return { accessToken, refreshToken, expiresIn: ACCESS_TOKEN_TTL_SEC };
}

// ---------------------------------------------------------------------------
// verifyAccess — verifies signature + expiry; does NOT check revocation
// (access tokens are short-lived; revocation list is optional overhead)
// ---------------------------------------------------------------------------
export function verifyAccess(token: string): AccessTokenPayload {
  return _verify<AccessTokenPayload>(token);
}

// ---------------------------------------------------------------------------
// verifyRefresh — verifies signature + expiry + store presence (revocation)
// ---------------------------------------------------------------------------
export function verifyRefresh(token: string): RefreshTokenPayload {
  const payload = _verify<RefreshTokenPayload>(token);
  const entry = refreshStore.get(payload.jti);
  if (!entry || entry.userId !== payload.sub) {
    throw new Error("Refresh token has been revoked or is unknown");
  }
  const now = Math.floor(Date.now() / 1000);
  if (entry.expiresAt <= now) {
    refreshStore.delete(payload.jti);
    throw new Error("Refresh token has expired");
  }
  return payload;
}

// ---------------------------------------------------------------------------
// revokeRefresh — invalidates a refresh token immediately (logout / rotation)
// ---------------------------------------------------------------------------
export function revokeRefresh(token: string): void {
  try {
    const payload = _verify<RefreshTokenPayload>(token);
    refreshStore.delete(payload.jti);
  } catch {
    // Already invalid — silently ignore so logout never fails
  }
}

// ---------------------------------------------------------------------------
// Legacy signJwt / verifyJwt — kept for backward-compat with existing routes.
// Routes should migrate to signTokens / verifyAccess over time.
// ---------------------------------------------------------------------------
export interface JwtPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
}

/** @deprecated Use signTokens() instead */
export function signJwt(payload: Omit<JwtPayload, "iat" | "exp">): string {
  return signTokens(payload.sub, payload.email).accessToken;
}

/** @deprecated Use verifyAccess() instead */
export function verifyJwt(token: string): JwtPayload {
  return _verify<JwtPayload>(token);
}

// ---------------------------------------------------------------------------
// Internal generic verifier — shared by all public verify functions
// ---------------------------------------------------------------------------
function _verify<T extends { exp: number }>(token: string): T {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Malformed token");

  const [header, body, receivedSig] = parts as [string, string, string];
  const expectedSig = sign(`${header}.${body}`);

  const a = Buffer.from(receivedSig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("Invalid token signature");
  }

  let payload: T;
  try {
    payload = JSON.parse(b64urlDecode(body)) as T;
  } catch {
    throw new Error("Token payload is not valid JSON");
  }

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number" || payload.exp <= now) {
    throw new Error("Token has expired");
  }

  return payload;
}
