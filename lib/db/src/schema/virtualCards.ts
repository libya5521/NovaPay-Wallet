// lib/db/src/schema/virtualCards.ts
//
// SECURITY: We never store a full PAN or CVV.
//   • maskedNumber — last 4 digits only (e.g. "4321")
//   • token        — random opaque surrogate for referencing the card
//   • expiresAt    — card expiry date stored as a full timestamp
//
// The full card number is generated at registration and shown ONCE to the user
// via the mobile app. It is never persisted.  CVV is never generated, stored,
// or returned by any API endpoint.
//
import { boolean, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const virtualCardsTable = pgTable(
  "virtual_cards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    maskedNumber: text("masked_number").notNull(), // Last 4 digits only
    token: text("token").notNull().unique(),        // Opaque surrogate reference
    cardHolder: text("card_holder").notNull(),
    expiresAt: timestamp("expires_at").notNull(),   // Card expiry date
    cardType: text("card_type").notNull().default("visa"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("virtual_cards_user_id_idx").on(t.userId)]
);

export const insertVirtualCardSchema = createInsertSchema(virtualCardsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertVirtualCard = z.infer<typeof insertVirtualCardSchema>;
export type VirtualCard = typeof virtualCardsTable.$inferSelect;
