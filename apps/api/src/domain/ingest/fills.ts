import { eq } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { fills, ingestState } from "../../db/schema.js";
import type { StrikeClient, StrikeFill } from "../../strike.js";

const PAGE = 1000;
const MAX_PAGES = 30;
const LIQUIDATION_TYPES = new Set(["liquidation", "adl", "bankrupt"]);

export { LIQUIDATION_TYPES };

function toRow(f: StrikeFill) {
  return {
    id: f.id,
    tradeId: f.trade_id,
    orderId: f.order_id,
    accountId: f.account_id,
    symbol: f.symbol,
    side: f.side,
    role: f.role,
    price: f.price,
    size: f.size,
    realizedPnl: f.realized_pnl,
    fee: f.fee,
    leverage: f.leverage ?? null,
    autoCloseType: f.auto_close_type || null,
    isCopy: (f.client_order_id ?? "").startsWith("copy:"),
    ts: new Date(f.timestamp),
  };
}

export type FillsResult = { inserted: number; minTs: number | null; maxTs: number | null };

/**
 * First run for a trader: page backwards from now to backfillFrom. Later runs: page forwards
 * from the last trade id seen. Re-running is safe; fills are keyed by Strike's fill id.
 */
export async function ingestTraderFills(db: Db, strike: StrikeClient, accountId: string, backfillFrom: Date): Promise<FillsResult> {
  const [state] = await db.select().from(ingestState).where(eq(ingestState.accountId, accountId));
  const got: StrikeFill[] = [];

  if (state?.lastTradeId == null) {
    let fromId: number | undefined;
    for (let page = 0; page < MAX_PAGES; page++) {
      const batch = await strike.fillsBefore(accountId, { startTime: backfillFrom.getTime(), fromId, limit: PAGE });
      got.push(...batch);
      if (batch.length < PAGE) break;
      fromId = Math.min(...batch.map((f) => f.id));
    }
  } else {
    let since = state.lastTradeId;
    for (let page = 0; page < MAX_PAGES; page++) {
      const batch = await strike.fillsSince(accountId, since, PAGE);
      got.push(...batch);
      if (batch.length < PAGE) break;
      since = Math.max(...batch.map((f) => f.trade_id));
    }
  }

  let inserted = 0;
  for (let i = 0; i < got.length; i += 500) {
    const rows = await db.insert(fills).values(got.slice(i, i + 500).map(toRow)).onConflictDoNothing().returning({ id: fills.id });
    inserted += rows.length;
  }

  const lastTradeId = got.length ? Math.max(state?.lastTradeId ?? 0, ...got.map((f) => f.trade_id)) : (state?.lastTradeId ?? null);
  await db
    .insert(ingestState)
    .values({ accountId, lastTradeId, lastRunAt: new Date(), lastError: null })
    .onConflictDoUpdate({ target: ingestState.accountId, set: { lastTradeId, lastRunAt: new Date(), lastError: null } });

  const stamps = got.map((f) => f.timestamp);
  return { inserted, minTs: stamps.length ? Math.min(...stamps) : null, maxTs: stamps.length ? Math.max(...stamps) : null };
}

export async function recordFillsError(db: Db, accountId: string, error: string) {
  await db
    .insert(ingestState)
    .values({ accountId, lastRunAt: new Date(), lastError: error.slice(0, 500) })
    .onConflictDoUpdate({ target: ingestState.accountId, set: { lastRunAt: new Date(), lastError: error.slice(0, 500) } });
}
