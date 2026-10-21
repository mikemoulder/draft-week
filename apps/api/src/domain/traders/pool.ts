import { and, eq, sql } from "drizzle-orm";
import type { PoolTrader, TraderStyle, WeekInfo, WeekStatus } from "@draftweek/shared";
import type { Db } from "../../db/client.js";
import { traderDays, traders } from "../../db/schema.js";
import { addWeeks, weekBounds, weekIdOf } from "../scoring/weeks.js";

// Draftable = an active person, not a bot: 5 to 3,000 visible trades in the week before.
export const POOL_MIN_TRADES = 5;
export const POOL_MAX_TRADES = 3000;

export type PrevWeek = {
  accountId: string;
  name: string;
  points: number;
  pnl: number;
  trades: number;
  activeDays: number;
  closes: number;
  wins: number;
  liquidations: number;
  avgLeverage: number | null;
};

// Thresholds from week 2026-10-12: median average leverage was ~18x and the top quarter ran 29x+,
// so "degen" means clearly above the crowd, not just the default 20x.
export const DEGEN_LEVERAGE = 30;

export function styleOf(s: Pick<PrevWeek, "trades" | "activeDays" | "liquidations" | "avgLeverage">): TraderStyle {
  if ((s.avgLeverage ?? 0) >= DEGEN_LEVERAGE || s.liquidations >= 2) return "degen";
  if (s.trades / Math.max(s.activeDays, 1) >= 40) return "scalper";
  if (s.trades <= 15) return "swing";
  return "steady";
}

export function weekStatus(weekId: string, now: Date): WeekStatus {
  const { start, end } = weekBounds(weekId);
  if (end.getTime() <= now.getTime()) return "final";
  if (start.getTime() <= now.getTime()) return "live";
  return "upcoming";
}

async function prevWeekStats(db: Db, weekId: string): Promise<PrevWeek[]> {
  const prev = addWeeks(weekId, -1);
  const rows = await db
    .select({
      accountId: traderDays.accountId,
      name: traders.name,
      points: sql<number>`sum(${traderDays.points})::int`,
      pnl: sql<number>`sum(${traderDays.pnl})::float8`,
      trades: sql<number>`sum(${traderDays.trades})::int`,
      activeDays: sql<number>`count(*)::int`,
      closes: sql<number>`sum(${traderDays.closes})::int`,
      wins: sql<number>`sum(${traderDays.wins})::int`,
      liquidations: sql<number>`sum(${traderDays.liquidations})::int`,
      avgLeverage: sql<number | null>`avg(${traderDays.avgLeverage})::float8`,
    })
    .from(traderDays)
    .innerJoin(traders, eq(traders.accountId, traderDays.accountId))
    .where(and(eq(traderDays.weekId, prev), eq(traders.optedOut, false)))
    .groupBy(traderDays.accountId, traders.name)
    .having(sql`sum(${traderDays.trades}) between ${POOL_MIN_TRADES} and ${POOL_MAX_TRADES}`);
  return rows as PrevWeek[];
}

/** The draft pool for a league on weekId, ranked by last week's points. */
export async function draftPool(db: Db, weekId: string): Promise<PoolTrader[]> {
  const rows = await prevWeekStats(db, weekId);
  return rows
    .map((r) => ({
      accountId: r.accountId,
      name: r.name,
      style: styleOf(r),
      prevWeek: {
        points: r.points,
        pnl: Math.round(r.pnl * 100) / 100,
        trades: r.trades,
        activeDays: r.activeDays,
        winRate: r.closes > 0 ? Math.round((r.wins / r.closes) * 1000) / 10 : null,
        liquidations: r.liquidations,
      },
    }))
    .sort((a, b) => b.prevWeek.points - a.prevWeek.points || a.accountId.localeCompare(b.accountId));
}

/** Weeks a league can be created for: recent finished weeks (replays), this week and next. */
export async function playableWeeks(db: Db, now: Date): Promise<WeekInfo[]> {
  const current = weekIdOf(now);
  const candidates = [-2, -1, 0, 1].map((n) => addWeeks(current, n));
  const rows = await db.execute<{ week_id: string; n: number }>(sql`
    select week_id, count(*)::int as n
    from (
      select d.week_id, d.account_id from trader_days d
      join traders t on t.account_id = d.account_id and not t.opted_out
      group by d.week_id, d.account_id
      having sum(trades) between ${POOL_MIN_TRADES} and ${POOL_MAX_TRADES}
    ) eligible
    group by week_id`);
  const counts = new Map(rows.map((r) => [r.week_id, r.n]));

  return candidates
    .map((id) => {
      const { start, end } = weekBounds(id);
      return {
        id,
        status: weekStatus(id, now),
        startsAt: start.getTime(),
        endsAt: end.getTime(),
        draftable: counts.get(addWeeks(id, -1)) ?? 0,
      };
    })
    .filter((w) => w.draftable > 0);
}
