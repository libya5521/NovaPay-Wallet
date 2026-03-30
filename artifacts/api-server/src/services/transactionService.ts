import { db, transactionsTable } from "@workspace/db";
import { eq, desc, count } from "drizzle-orm";

export async function getTransactions(
  userId: string,
  page: number = 1,
  limit: number = 20
) {
  const offset = (page - 1) * limit;

  const [rows, totalResult] = await Promise.all([
    db
      .select()
      .from(transactionsTable)
      .where(eq(transactionsTable.userId, userId))
      .orderBy(desc(transactionsTable.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(transactionsTable)
      .where(eq(transactionsTable.userId, userId)),
  ]);

  const total = totalResult[0]?.count ?? 0;

  return {
    transactions: rows.map((tx) => ({
      id: tx.id,
      type: tx.type,
      amount: parseFloat(tx.amount),
      currency: tx.currency,
      description: tx.description,
      status: tx.status,
      counterpartyName: tx.counterpartyName ?? null,
      counterpartyEmail: tx.counterpartyEmail ?? null,
      createdAt: tx.createdAt.toISOString(),
    })),
    total,
    page,
    limit,
    hasMore: offset + rows.length < total,
  };
}
