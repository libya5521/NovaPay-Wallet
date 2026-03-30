// lib/db/src/schema/refreshTokens.ts
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const refreshTokensTable = pgTable(
  "refresh_tokens",
  {
    token: text("token").primaryKey(),            // Raw jti (hex string)
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at").notNull(),
    revokedAt: timestamp("revoked_at"),           // null = still valid
  },
  (t) => [index("refresh_tokens_user_id_idx").on(t.userId)]
);

export type RefreshToken = typeof refreshTokensTable.$inferSelect;
