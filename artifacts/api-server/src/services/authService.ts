import { createHash } from "crypto";
import { db, usersTable, walletsTable, virtualCardsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signJwt } from "../lib/jwt.js";

/**
 * Bcrypt-style password hashing using Node.js built-in crypto.
 * For production: replace with `bcrypt` or `argon2` npm package.
 * Integration point: `npm install bcrypt` and swap these functions.
 */
function hashPassword(password: string): string {
  // Simple PBKDF2-style hash with salt (no external deps)
  const salt = createHash("sha256").update(Date.now().toString()).digest("hex").slice(0, 16);
  const hash = createHash("sha256").update(salt + password).digest("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const computed = createHash("sha256").update(salt + password).digest("hex");
  return computed === hash;
}

function generateAccountNumber(): string {
  const digits = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join("");
  return `${digits.slice(0, 4)}${digits.slice(4, 8)}${digits.slice(8)}`;
}

function generateCardNumber(): string {
  const groups = Array.from({ length: 4 }, () =>
    Array.from({ length: 4 }, () => Math.floor(Math.random() * 10)).join("")
  );
  return groups.join("");
}

function generateCvv(): string {
  return Array.from({ length: 3 }, () => Math.floor(Math.random() * 10)).join("");
}

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

  const passwordHash = hashPassword(data.password);

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

  // Create wallet for new user
  const [wallet] = await db
    .insert(walletsTable)
    .values({
      userId: user.id,
      balance: "1000.00", // Demo starting balance
      currency: "USD",
      accountNumber: generateAccountNumber(),
    })
    .returning();

  // Create virtual card for new user
  // Integration point: Replace with Wallester card issuance API call
  // See: https://docs.wallester.com/api/cards/create
  const now = new Date();
  const expiryYear = now.getFullYear() + 4;
  const expiryMonth = now.getMonth() + 1;

  await db.insert(virtualCardsTable).values({
    userId: user.id,
    cardNumber: generateCardNumber(),
    cardHolder: `${data.firstName.toUpperCase()} ${data.lastName.toUpperCase()}`,
    expiryMonth,
    expiryYear,
    cvv: generateCvv(),
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
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      kycStatus: user.kycStatus,
      createdAt: user.createdAt.toISOString(),
    },
  };
}

export async function loginUser(email: string, password: string) {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()))
    .limit(1);

  if (!user || !verifyPassword(password, user.passwordHash)) {
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
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      kycStatus: user.kycStatus,
      createdAt: user.createdAt.toISOString(),
    },
  };
}
