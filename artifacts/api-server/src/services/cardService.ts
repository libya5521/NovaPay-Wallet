// artifacts/api-server/src/services/cardService.ts
//
// SECURITY: Full card numbers and CVV are NEVER stored or returned.
//   • maskedNumber — last 4 digits only (e.g. "4321")
//   • token        — opaque surrogate reference
//   • expiresAt    — card expiry timestamp
//
import { db, virtualCardsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

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

export async function getVirtualCard(userId: string): Promise<CardDetails> {
  const [card] = await db
    .select()
    .from(virtualCardsTable)
    .where(eq(virtualCardsTable.userId, userId))
    .limit(1);

  if (!card) {
    throw Object.assign(new Error("Card not found"), { code: "CARD_NOT_FOUND" });
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
