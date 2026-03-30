import bcrypt from "bcrypt";
import { db, usersTable, walletsTable, virtualCardsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signJwt } from "../lib/jwt.js";

const BCRYPT_ROUNDS = 12;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  return bcrypt.compare(password, stored);
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

  const [wallet] = await db
    .insert(walletsTable)
    .values({
      userId: user.id,
      balance: "1000.00",
      currency: "USD",
      accountNumber: generateAccountNumber(),
    })
    .returning();

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
      phone: user.phone ?? null,
      avatarUrl: user.avatarUrl ?? null,
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

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
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
