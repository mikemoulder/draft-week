import { and, asc, desc, eq } from "drizzle-orm";
import type { TraderDetail } from "@draftweek/shared";
import type { Db } from "../../db/client.js";
import { fills, traderDays } from "../../db/schema.js";
import { addWeeks } from "../scoring/weeks.js";
import { draftPool } from "./pool.js";

const LIQUIDATION = new Set(["liquidation", "adl", "bankrupt"]);

/** One trader as priced for a league week: last week day by day, and their latest trades. */
export async function traderDetail(db: Db, weekId: string, accountId: string): Promise<TraderDetail | null> {
  const trader = (await draftPool(db, weekId)).find((t) => t.accountId === accountId);
  if (!trader) return null;
  const days = await db
    .select({ day: traderDays.day, points: traderDays.points, trades: traderDays.trades, pnl: traderDays.pnl, liquidations: traderDays.liquidations })
    .from(traderDays)
    .where(and(eq(traderDays.weekId, addWeeks(weekId, -1)), eq(traderDays.accountId, accountId)))
    .orderBy(asc(traderDays.day));
  const recent = await db.select().from(fills).where(eq(fills.accountId, accountId)).orderBy(desc(fills.ts)).limit(15);
  return {
    trader,
    days: days.map((d) => ({ day: d.day, points: d.points, trades: d.trades, pnl: Math.round(d.pnl * 100) / 100, liquidated: d.liquidations > 0 })),
    recentFills: recent.map((f) => ({
      at: f.ts.getTime(),
      symbol: f.symbol,
      side: f.side,
      size: f.size,
      price: f.price,
      pnl: Math.round((f.realizedPnl - f.fee) * 100) / 100,
      liquidation: LIQUIDATION.has(f.autoCloseType ?? ""),
    })),
  };
}
