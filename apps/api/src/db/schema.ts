import { pgTable, text, timestamp, uuid, index } from "drizzle-orm/pg-core";

// ── Accounts ────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  displayName: text("display_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const wallets = pgTable(
  "wallets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    chain: text("chain", { enum: ["cardano", "solana", "ethereum"] }).notNull(),
    // Normalized form: bech32 for Cardano, base58 for Solana, lowercase hex for Ethereum.
    address: text("address").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("wallets_user_idx").on(t.userId)],
);

// One row per sign-in attempt. Single use: usedAt is set atomically before verification.
export const authChallenges = pgTable("auth_challenges", {
  nonce: text("nonce").primaryKey(),
  chain: text("chain", { enum: ["cardano", "solana", "ethereum"] }).notNull(),
  address: text("address").notNull(),
  message: text("message").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
});

// id is the SHA-256 of the cookie token, so a database leak does not leak live sessions.
export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);
