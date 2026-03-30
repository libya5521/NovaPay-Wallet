import { db, virtualCardsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export async function getVirtualCard(userId: string) {
  const [card] = await db
    .select()
    .from(virtualCardsTable)
    .where(eq(virtualCardsTable.userId, userId))
    .limit(1);

  if (!card) {
    throw Object.assign(new Error("Card not found"), { code: "CARD_NOT_FOUND" });
  }

  return {
    id: card.id,
    cardNumber: card.cardNumber,
    cardHolder: card.cardHolder,
    expiryMonth: card.expiryMonth,
    expiryYear: card.expiryYear,
    cvv: card.cvv,
    cardType: card.cardType as "visa" | "mastercard",
    isActive: card.isActive,
  };
}

export async function freezeCard(userId: string) {
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

  return {
    id: updated.id,
    cardNumber: updated.cardNumber,
    cardHolder: updated.cardHolder,
    expiryMonth: updated.expiryMonth,
    expiryYear: updated.expiryYear,
    cvv: updated.cvv,
    cardType: updated.cardType as "visa" | "mastercard",
    isActive: updated.isActive,
  };
}

export async function unfreezeCard(userId: string) {
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

  return {
    id: updated.id,
    cardNumber: updated.cardNumber,
    cardHolder: updated.cardHolder,
    expiryMonth: updated.expiryMonth,
    expiryYear: updated.expiryYear,
    cvv: updated.cvv,
    cardType: updated.cardType as "visa" | "mastercard",
    isActive: updated.isActive,
  };
}
