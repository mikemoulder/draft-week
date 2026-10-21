import { and, eq, gte, inArray, lt, sql } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { fills, traderDays, traderEquity } from "../../db/schema.js";
import { MIN_EQUITY, SCORING_VERSION, scoreDay, type DayStat } from "../scoring/points.js";
import { DAY_MS, weekBounds } from "../scoring/weeks.js";

type Agg = {
  accountId: string;
  day: number;
  pnl: number;
  trades: number;
  closes: number;
  wins: number;
  liquidations: number;
  firstLiquidationAt: Date | null;
  avgLeverage: number | null;
};

/** Equity going into a day: the last observation before it, else the first one after, else the floor. */
export function equityAt(observations: { at: number; equity: number }[], dayStart: number): number {
  let before: number | null = null;
  let after: number | null = null;
  for (const o of observations) {
    if (o.at <= dayStart) before = o.equity;
    else if (after === null) after = o.equity;
  }
  return Math.max(before ?? after ?? MIN_EQUITY, MIN_EQUITY);
}

/** Rebuild every trader_days row of one week from the fills table. Idempotent. */
export async function recomputeWeek(db: Db, weekId: string): Promise<number> {
  const { start, end } = weekBounds(weekId);
  const liq = sql`${fills.autoCloseType} in ('liquidation', 'adl', 'bankrupt')`;

  const rows = (await db
    .select({
      accountId: fills.accountId,
      day: sql<number>`floor(extract(epoch from (${fills.ts} - ${start.toISOString()}::timestamptz)) / 86400)::int`,
      pnl: sql<number>`sum(${fills.realizedPnl} - ${fills.fee})::float8`,
      trades: sql<number>`count(*)::int`,
      closes: sql<number>`(count(*) filter (where ${fills.realizedPnl} <> 0))::int`,
      wins: sql<number>`(count(*) filter (where ${fills.realizedPnl} > 0))::int`,
      liquidations: sql<number>`(count(distinct ${fills.orderId}) filter (where ${liq}))::int`,
      firstLiquidationAt: sql<Date | null>`min(${fills.ts}) filter (where ${liq})`,
      avgLeverage: sql<number | null>`avg(${fills.leverage})::float8`,
    })
    .from(fills)
    .where(and(gte(fills.ts, start), lt(fills.ts, end)))
    .groupBy(sql`1`, sql`2`)) as Agg[];

  const accounts = [...new Set(rows.map((r) => r.accountId))];
  const equityRows = accounts.length
    ? await db
        .select()
        .from(traderEquity)
        .where(inArray(traderEquity.accountId, accounts))
        .orderBy(traderEquity.accountId, traderEquity.observedAt)
    : [];
  const equityBy = new Map<string, { at: number; equity: number }[]>();
  for (const e of equityRows) {
    const list = equityBy.get(e.accountId) ?? [];
    list.push({ at: e.observedAt.getTime(), equity: e.equity });
    equityBy.set(e.accountId, list);
  }

  const out: (typeof traderDays.$inferInsert)[] = [];
  for (let day = 0; day < 7; day++) {
    const dayStart = start.getTime() + day * DAY_MS;
    const today = rows.filter((r) => r.day === day);
    const stats: (DayStat & Agg)[] = today.map((r) => ({
      ...r,
      equityRef: equityAt(equityBy.get(r.accountId) ?? [], dayStart),
    }));
    const points = scoreDay(stats);
    for (const s of stats) {
      out.push({
        weekId,
        accountId: s.accountId,
        day,
        pnl: s.pnl,
        trades: s.trades,
        closes: s.closes,
        wins: s.wins,
        liquidations: s.liquidations,
        firstLiquidationAt: s.firstLiquidationAt ? new Date(s.firstLiquidationAt) : null,
        avgLeverage: s.avgLeverage,
        equityRef: s.equityRef,
        points: points.get(s.accountId) ?? 0,
        scoringVersion: SCORING_VERSION,
      });
    }
  }

  await db.transaction(async (tx) => {
    await tx.delete(traderDays).where(eq(traderDays.weekId, weekId));
    for (let i = 0; i < out.length; i += 1000) await tx.insert(traderDays).values(out.slice(i, i + 1000));
  });
  return out.length;
}
