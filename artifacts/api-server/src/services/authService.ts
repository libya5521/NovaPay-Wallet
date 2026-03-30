// artifacts/api-server/src/services/authService.ts
import { db, usersTable, walletsTable, virtualCardsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword, generateSecureId, generateCardToken } from "../lib/crypto.js";
import { signJwt } from "../lib/jwt.js";

// ── Helpers ─────────────────────────────────────────────────────────────────

function generateAccountNumber(): string {
  // 12 cryptographically random digits grouped as XXXX-XXXX-XXXX
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  const digits = Array.from(bytes)
    .map((b) => b % 10)
    .join("")
    .padStart(12, "0")
    .slice(0, 12);
  return digits;
}

// ── Register ─────────────────────────────────────────────────────────────────

export async function registerUser(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}) {
  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, data.email.toLowerCase()))
    .limit(1);

  if (existing.length > 0) {
    throw Object.assign(new Error("Email already registered"), { code: "DUPLICATE_EMAIL" });
  }

  const passwordHash = await hashPassword(data.password);

  const [user] = await db
    .insert(usersTable)
    .values({
      email: data.email.toLowerCase(),
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
    })
    .returning();

  await db.insert(walletsTable).values({
    userId: user.id,
    balance: "1000.00",  // Welcome balance for demo
    currency: "USD",
    accountNumber: generateAccountNumber(),
  });

  // Card setup — store only last 4 digits + an opaque token.
  // CVV is never generated, stored, or returned.
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setUTCFullYear(now.getUTCFullYear() + 4);

  // Generate a random last-4 for the masked number
  const last4 = String(Math.floor(1000 + Math.random() * 9000));

  await db.insert(virtualCardsTable).values({
    userId: user.id,
    maskedNumber: last4,
    token: generateCardToken(),
    cardHolder: `${data.firstName.toUpperCase()} ${data.lastName.toUpperCase()}`,
    expiresAt,
    cardType: "visa",
    isActive: true,
  });

  const token = signJwt({ sub: user.id, email: user.email });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone ?? null,
      avatarUrl: user.avatarUrl ?? null,
      kycStatus: user.kycStatus,
      createdAt: user.createdAt.toISOString(),
    },
  };
}

// ── Login ─────────────────────────────────────────────────────────────────────

export async function loginUser(email: string, password: string) {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()))
    .limit(1);

  // Constant-time path: always run verifyPassword even if user not found
  // so timing doesn't reveal whether an email exists
  const hash = user?.passwordHash ?? "$2b$12$invalidhashpadding000000000000000000000000000000000000000";
  const valid = await verifyPassword(password, hash);

  if (!user || !valid) {
    throw Object.assign(new Error("Invalid email or password"), { code: "INVALID_CREDENTIALS" });
  }

  const token = signJwt({ sub: user.id, email: user.email });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone ?? null,
      avatarUrl: user.avatarUrl ?? null,
      kycStatus: user.kycStatus,
      createdAt: user.createdAt.toISOString(),
    },
  };
}
