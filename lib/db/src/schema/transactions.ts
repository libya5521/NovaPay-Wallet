// lib/db/src/schema/transactions.ts
import { decimal, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { walletsTable } from "./wallets";

export const transactionsTable = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // userId — the user who "owns" this ledger entry (for list queries)
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    // Transfer participants — both nullable to accommodate non-transfer types
    fromAccountId: uuid("from_account_id").references(() => walletsTable.id, {
      onDelete: "set null",
    }),
    toAccountId: uuid("to_account_id").references(() => walletsTable.id, {
      onDelete: "set null",
    }),
    type: text("type").notNull(), // deposit | withdrawal | send | receive | card_payment
    amount: decimal("amount", { precision: 18, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("USD"),
    description: text("description").notNull(),
    status: text("status").notNull().default("completed"), // pending | completed | failed
    counterpartyName: text("counterparty_name"),
    counterpartyEmail: text("counterparty_email"),
    referenceId: text("reference_id").unique(),
    // idempotencyKey: client-supplied key, unique per transfer attempt
    idempotencyKey: text("idempotency_key").unique(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("transactions_user_id_idx").on(t.userId),
    index("transactions_from_account_id_idx").on(t.fromAccountId),
    index("transactions_idempotency_key_idx").on(t.idempotencyKey),
  ]
);

export const insertTransactionSchema = createInsertSchema(transactionsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactionsTable.$inferSelect;
