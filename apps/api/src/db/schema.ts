import {
  bigint,
  boolean,
  doublePrecision,
  index,
  integer,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { isNotNull } from "drizzle-orm";

// ── Accounts ────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  displayName: text("display_name").notNull(),
  // The Strike account behind the wallet the user signed in with, looked up at sign-in.
  strikeAccountId: text("strike_account_id"),
  strikeAddress: text("strike_address"),
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

// ── Strike data (written by the ingest worker) ─────────────────────────────

export const traders = pgTable("traders", {
  accountId: text("account_id").primaryKey(),
  name: text("name").notNull(),
  adaHandle: text("ada_handle"),
  nickname: text("nickname"),
  blockchainAddress: text("blockchain_address"),
  avatarUrl: text("avatar_url"),
  optedOut: boolean("opted_out").notNull().default(false),
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Equity observations, at most hourly per trader. Daily returns are divided by the equity the
// trader had going into that day, not by today's balance.
export const traderEquity = pgTable(
  "trader_equity",
  {
    accountId: text("account_id").notNull(),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
    equity: doublePrecision("equity").notNull(),
  },
  (t) => [primaryKey({ columns: [t.accountId, t.observedAt] })],
);

export const fills = pgTable(
  "fills",
  {
    id: bigint("id", { mode: "number" }).primaryKey(),
    tradeId: bigint("trade_id", { mode: "number" }).notNull(),
    orderId: bigint("order_id", { mode: "number" }).notNull(),
    accountId: text("account_id").notNull(),
    symbol: text("symbol").notNull(),
    side: text("side").notNull(),
    role: text("role").notNull(),
    price: doublePrecision("price").notNull(),
    size: doublePrecision("size").notNull(),
    realizedPnl: doublePrecision("realized_pnl").notNull(),
    fee: doublePrecision("fee").notNull(),
    leverage: integer("leverage"),
    autoCloseType: text("auto_close_type"),
    isCopy: boolean("is_copy").notNull().default(false),
    ts: timestamp("ts", { withTimezone: true }).notNull(),
  },
  (t) => [index("fills_account_ts_idx").on(t.accountId, t.ts)],
);

export const ingestState = pgTable("ingest_state", {
  accountId: text("account_id").primaryKey(),
  lastTradeId: bigint("last_trade_id", { mode: "number" }),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  lastError: text("last_error"),
});

export const ingestRuns = pgTable("ingest_runs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  traders: integer("traders"),
  fillsInserted: integer("fills_inserted"),
  error: text("error"),
});

// One row per trader per day of a week (Monday 00:00 UTC start). Recomputed by ingest.
export const traderDays = pgTable(
  "trader_days",
  {
    weekId: text("week_id").notNull(),
    accountId: text("account_id").notNull(),
    day: smallint("day").notNull(),
    pnl: doublePrecision("pnl").notNull(),
    trades: integer("trades").notNull(),
    closes: integer("closes").notNull(),
    wins: integer("wins").notNull(),
    liquidations: integer("liquidations").notNull(),
    firstLiquidationAt: timestamp("first_liquidation_at", { withTimezone: true }),
    avgLeverage: doublePrecision("avg_leverage"),
    equityRef: doublePrecision("equity_ref").notNull(),
    points: integer("points").notNull(),
    scoringVersion: smallint("scoring_version").notNull(),
  },
  (t) => [primaryKey({ columns: [t.weekId, t.accountId, t.day] }), index("trader_days_account_idx").on(t.accountId)],
);

// ── Leagues ─────────────────────────────────────────────────────────────────

export const leagues = pgTable("leagues", {
  id: uuid("id").primaryKey().defaultRandom(),
  weekId: text("week_id").notNull(),
  name: text("name").notNull(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  inviteCode: text("invite_code").notNull().unique(),
  size: smallint("size").notNull().default(8),
  // Finished-week (replay) leagues reveal results only after the owner plays the week.
  playedAt: timestamp("played_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const leagueMembers = pgTable(
  "league_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leagueId: uuid("league_id")
      .notNull()
      .references(() => leagues.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }), // null = bot
    displayName: text("display_name").notNull(),
    seat: smallint("seat").notNull(),
    // Extra credits from this manager's Strike volume, fixed when they joined.
    budgetBonus: smallint("budget_bonus").notNull().default(0),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("league_members_seat_uq").on(t.leagueId, t.seat),
    uniqueIndex("league_members_user_uq").on(t.leagueId, t.userId).where(isNotNull(t.userId)),
  ],
);

// One squad per manager per league. Traders are not exclusive: friends may pick the same trader.
export const squads = pgTable("squads", {
  memberId: uuid("member_id")
    .primaryKey()
    .references(() => leagueMembers.id, { onDelete: "cascade" }),
  captainId: text("captain_id").notNull(),
  starters: text("starters").array().notNull(),
  bench: text("bench").array().notNull(),
  spent: integer("spent").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
