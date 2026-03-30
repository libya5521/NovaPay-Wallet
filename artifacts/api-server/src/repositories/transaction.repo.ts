// artifacts/api-server/src/repositories/transaction.repo.ts
//
// Pure data-access layer for transaction records.
// Contains NO business logic.
//
import { db, transactionsTable } from "@workspace/db";
import type { Transaction, InsertTransaction } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@workspace/db/schema";

type Tx = NodePgDatabase<typeof schema>;

export type TransactionRow = Transaction;

// ── Read ───────────────────────────────────────────────────────────────────

export async function findById(
  id: string,
  tx?: Tx
): Promise<TransactionRow | undefined> {
  const executor = tx ?? db;
  const [row] = await executor
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.id, id))
    .limit(1);
  return row;
}

export async function findByIdempotencyKey(
  key: string
): Promise<TransactionRow | undefined> {
  const [row] = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.idempotencyKey, key))
    .limit(1);
  return row;
}

// ── Write ──────────────────────────────────────────────────────────────────

export async function create(
  data: InsertTransaction,
  tx?: Tx
): Promise<TransactionRow> {
  const executor = tx ?? db;
  const [row] = await executor
    .insert(transactionsTable)
    .values(data)
    .returning();
  return row;
}
