import { sql } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { traderEquity, traders } from "../../db/schema.js";
import type { LeaderboardEntry, StrikeClient } from "../../strike.js";

// Accounts above this many trades in 30 days are market makers or bots, not draftable people,
// and paging their history every few minutes would dominate the rate budget.
export const MAX_TRADES_30D = 20_000;
const PAGE = 200;
const MAX_PAGES = 15;

export function displayName(e: LeaderboardEntry): string {
  if (e.nickname?.trim()) return e.nickname.trim();
  if (e.ada_handle?.trim()) return `$${e.ada_handle.trim().replace(/^\$/, "")}`;
  const addr = e.blockchain_address?.trim();
  if (addr) return `${addr.slice(0, 8)}…${addr.slice(-5)}`;
  return `trader-${e.account_id.slice(0, 8)}`;
}

export function isDraftable(e: LeaderboardEntry): boolean {
  return !e.account_id.startsWith("vault_") && !e.vault_id && e.total_trades > 0 && e.total_trades <= MAX_TRADES_30D;
}

/** Pull the 30 day leaderboard into traders and record equity (one point per trader per hour). */
export async function discoverTraders(db: Db, strike: StrikeClient, now: Date): Promise<number> {
  const found: LeaderboardEntry[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const { entries } = await strike.leaderboard({ timeRange: "30d", sortBy: "trades", limit: PAGE, offset: page * PAGE });
    found.push(...entries.filter(isDraftable));
    // sorted by trades desc: once a page reaches zero-trade accounts, the rest are idle
    if (entries.length < PAGE || entries.some((e) => e.total_trades === 0)) break;
  }
  if (found.length === 0) return 0;

  const hour = new Date(Math.floor(now.getTime() / 3_600_000) * 3_600_000);
  await db
    .insert(traders)
    .values(
      found.map((e) => ({
        accountId: e.account_id,
        name: displayName(e),
        adaHandle: e.ada_handle || null,
        nickname: e.nickname || null,
        blockchainAddress: e.blockchain_address || null,
        updatedAt: now,
      })),
    )
    .onConflictDoUpdate({
      target: traders.accountId,
      set: {
        name: sql`excluded.name`,
        adaHandle: sql`excluded.ada_handle`,
        nickname: sql`excluded.nickname`,
        blockchainAddress: sql`excluded.blockchain_address`,
        updatedAt: sql`excluded.updated_at`,
      },
    });

  const withEquity = found.filter((e) => e.equity !== null && Number.isFinite(e.equity));
  if (withEquity.length > 0) {
    await db
      .insert(traderEquity)
      .values(withEquity.map((e) => ({ accountId: e.account_id, observedAt: hour, equity: e.equity as number })))
      .onConflictDoNothing();
  }
  return found.length;
}
