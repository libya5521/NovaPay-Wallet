// artifacts/api-server/src/services/cardService.ts
//
// SECURITY: Full card numbers and CVV are NEVER stored or returned.
//   • maskedNumber — last 4 digits only (e.g. "4321")
//   • token        — opaque surrogate reference
//   • expiresAt    — card expiry timestamp
//
import { db, usersTable, virtualCardsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { generateCardToken } from "../lib/crypto.js";

export interface CardDetails {
  id: string;
  maskedNumber: string;        // "4321" — last 4 digits only
  cardHolder: string;
  expiresAt: string;           // ISO date string, e.g. "2028-06"
  cardType: "visa" | "mastercard";
  isActive: boolean;
}

function toCardDetails(card: {
  id: string;
  maskedNumber: string;
  cardHolder: string;
  expiresAt: Date;
  cardType: string;
  isActive: boolean;
}): CardDetails {
  const d = card.expiresAt;
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return {
    id: card.id,
    maskedNumber: card.maskedNumber,
    cardHolder: card.cardHolder,
    expiresAt: `${year}-${month}`,
    cardType: card.cardType as "visa" | "mastercard",
    isActive: card.isActive,
  };
}

async function provisionCard(userId: string): Promise<typeof virtualCardsTable.$inferSelect> {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  const cardHolder = user
    ? `${(user.firstName ?? "").toUpperCase()} ${(user.lastName ?? "").toUpperCase()}`.trim()
    : "CARD HOLDER";

  const last4 = String(Math.floor(1000 + Math.random() * 9000));
  const expiresAt = new Date();
  expiresAt.setUTCFullYear(expiresAt.getUTCFullYear() + 4);

  const [card] = await db
    .insert(virtualCardsTable)
    .values({
      userId,
      maskedNumber: last4,
      token: generateCardToken(),
      cardHolder,
      expiresAt,
      cardType: "visa",
      isActive: true,
    })
    .returning();

  return card;
}

export async function getVirtualCard(userId: string): Promise<CardDetails> {
  let [card] = await db
    .select()
    .from(virtualCardsTable)
    .where(eq(virtualCardsTable.userId, userId))
    .limit(1);

  // Auto-provision a card for users who pre-date the secure schema
  if (!card) {
    card = await provisionCard(userId);
  }

  return toCardDetails(card);
}

export async function freezeCard(userId: string): Promise<CardDetails> {
  const [card] = await db
    .select()
    .from(virtualCardsTable)
    .where(eq(virtualCardsTable.userId, userId))
    .limit(1);

  if (!card) {
    throw Object.assign(new Error("Card not found"), { code: "CARD_NOT_FOUND" });
  }

  const [updated] = await db
    .update(virtualCardsTable)
    .set({ isActive: false })
    .where(eq(virtualCardsTable.id, card.id))
    .returning();

  return toCardDetails(updated);
}

export async function unfreezeCard(userId: string): Promise<CardDetails> {
  const [card] = await db
    .select()
    .from(virtualCardsTable)
    .where(eq(virtualCardsTable.userId, userId))
    .limit(1);

  if (!card) {
    throw Object.assign(new Error("Card not found"), { code: "CARD_NOT_FOUND" });
  }

  const [updated] = await db
    .update(virtualCardsTable)
    .set({ isActive: true })
    .where(eq(virtualCardsTable.id, card.id))
    .returning();

  return toCardDetails(updated);
}
