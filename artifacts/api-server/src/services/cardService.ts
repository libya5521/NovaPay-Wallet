import { db, virtualCardsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

/**
 * Get the virtual card for a user.
 *
 * Integration point: Replace this with Wallester API call to fetch live card data.
 * Wallester endpoint: GET /v1/cards/{card_id}
 * See: https://docs.wallester.com/api/cards/get
 *
 * Example Wallester integration:
 *   const response = await fetch(`https://api.wallester.com/v1/cards/${wallesterCardId}`, {
 *     headers: { Authorization: `Bearer ${process.env.WALLESTER_API_KEY}` }
 *   });
 */
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
    cardNumber: card.cardNumber,
    cardHolder: card.cardHolder,
    expiryMonth: card.expiryMonth,
    expiryYear: card.expiryYear,
    cvv: card.cvv,
    cardType: card.cardType as "visa" | "mastercard",
    isActive: card.isActive,
  };
}
