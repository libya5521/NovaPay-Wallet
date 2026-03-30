// artifacts/api-server/src/repositories/account.repo.ts
//
// Pure data-access layer for wallet/account records.
// Contains NO business logic — that lives in services/*.
//
// Every mutating method accepts an optional Drizzle transaction argument (tx).
// Callers are responsible for wrapping related calls in db.transaction().
// This file never auto-commits balance changes on its own.
//
import { db, walletsTable } from "@workspace/db";
import type { Wallet } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@workspace/db/schema";

type Tx = NodePgDatabase<typeof schema>;

export type AccountRow = Wallet;

// ── Read ───────────────────────────────────────────────────────────────────

export async function getById(id: string, tx?: Tx): Promise<AccountRow | undefined> {
  const executor = tx ?? db;
  const [row] = await executor
    .select()
    .from(walletsTable)
    .where(eq(walletsTable.id, id))
    .limit(1);
  return row;
}

export async function getByUserId(userId: string, tx?: Tx): Promise<AccountRow | undefined> {
  const executor = tx ?? db;
  const [row] = await executor
    .select()
    .from(walletsTable)
    .where(eq(walletsTable.userId, userId))
    .limit(1);
  return row;
}

// ── Write ──────────────────────────────────────────────────────────────────

/**
 * Apply a signed numeric delta to an account's balance.
 *
 * MUST be called inside a db.transaction() block — this function never
 * commits. The balance is stored as a numeric string; arithmetic is done in
 * SQL (CASE WHEN balance + delta < 0 ...) to prevent floating-point drift.
 *
 * The caller is responsible for checking insufficiency before calling this;
 * the CHECK constraint on the column is the last-resort safety net.
 *
 * @param id    — wallet UUID
 * @param delta — signed amount string, e.g. "-50.00" or "50.00"
 * @param tx    — required: must be inside a transaction
 */
export async function updateBalance(
  id: string,
  delta: string,
  tx: Tx
): Promise<AccountRow> {
  const [updated] = await tx
    .update(walletsTable)
    .set({
      // SQL arithmetic keeps precision; delta is a signed decimal string
      balance: sql`${walletsTable.balance} + ${delta}::numeric`,
      updatedAt: new Date(),
    })
    .where(eq(walletsTable.id, id))
    .returning();

  if (!updated) {
    throw new Error(`updateBalance: account ${id} not found`);
  }
  return updated;
}

/**
 * Direct balance set — use only for deposits/withdrawals already validated.
 * Must be called inside a transaction.
 */
export async function setBalance(
  id: string,
  newBalance: string,
  tx: Tx
): Promise<AccountRow> {
  const [updated] = await tx
    .update(walletsTable)
    .set({ balance: newBalance, updatedAt: new Date() })
    .where(eq(walletsTable.id, id))
    .returning();

  if (!updated) {
    throw new Error(`setBalance: account ${id} not found`);
  }
  return updated;
}
