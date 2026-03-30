import { db, transactionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

export async function getTransactions(
  userId: string,
  page: number = 1,
  limit: number = 20
) {
  const offset = (page - 1) * limit;

  const rows = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.userId, userId))
    .orderBy(desc(transactionsTable.createdAt))
    .limit(limit)
    .offset(offset);

  // Count total (simple approach — for production use a COUNT query)
  const all = await db
    .select({ id: transactionsTable.id })
    .from(transactionsTable)
    .where(eq(transactionsTable.userId, userId));

  return {
    transactions: rows.map((tx) => ({
      id: tx.id,
      type: tx.type,
      amount: parseFloat(tx.amount),
      currency: tx.currency,
      description: tx.description,
      status: tx.status,
      counterpartyName: tx.counterpartyName,
      counterpartyEmail: tx.counterpartyEmail,
      createdAt: tx.createdAt.toISOString(),
    })),
    total: all.length,
    page,
    limit,
  };
}
