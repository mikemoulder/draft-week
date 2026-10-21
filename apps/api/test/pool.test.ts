import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createDb } from "../src/db/client.js";
import { traderDays, traders } from "../src/db/schema.js";
import { draftPool, playableWeeks, rateCards, styleOf } from "../src/domain/traders/pool.js";

const url = process.env.TEST_DATABASE_URL;

describe("styleOf", () => {
  it("tags high leverage or repeated liquidations as degen, then scalper, swing, steady", () => {
    expect(styleOf({ trades: 50, activeDays: 5, liquidations: 0, avgLeverage: 35 })).toBe("degen");
    expect(styleOf({ trades: 50, activeDays: 5, liquidations: 0, avgLeverage: 20 })).toBe("steady");
    expect(styleOf({ trades: 50, activeDays: 5, liquidations: 2, avgLeverage: 3 })).toBe("degen");
    expect(styleOf({ trades: 400, activeDays: 5, liquidations: 0, avgLeverage: 5 })).toBe("scalper");
    expect(styleOf({ trades: 9, activeDays: 3, liquidations: 0, avgLeverage: 5 })).toBe("swing");
    expect(styleOf({ trades: 60, activeDays: 5, liquidations: 1, avgLeverage: 5 })).toBe("steady");
  });
});

describe("rateCards", () => {
  it("rates the best 99 and the worst 55, with tiers by percentile and shared ranks on ties", () => {
    const points = Array.from({ length: 101 }, (_, i) => i);
    const cards = rateCards(points);
    expect(cards[100]).toEqual({ rating: 99, tier: "legend" });
    expect(cards[0]).toEqual({ rating: 55, tier: "bronze" });
    expect(cards[85]?.tier).toBe("gold");
    expect(cards[60]?.tier).toBe("silver");
    expect(rateCards([5, 5, 1])).toEqual([rateCards([5, 5, 1])[1], rateCards([5, 5, 1])[0], { rating: 55, tier: "bronze" }]);
  });
});

describe.skipIf(!url)("draft pool", () => {
  const { sql: conn, db } = createDb(url ?? "postgres://unused");

  const day = (weekId: string, accountId: string, d: number, trades: number, points: number, extra = {}) => ({
    weekId,
    accountId,
    day: d,
    pnl: points * 10,
    trades,
    closes: trades,
    wins: Math.floor(trades / 2),
    liquidations: 0,
    avgLeverage: 5,
    equityRef: 1000,
    points,
    scoringVersion: 1,
    ...extra,
  });

  beforeAll(async () => {
    await migrate(db, { migrationsFolder: "drizzle" });
  });
  beforeEach(async () => {
    await db.execute(sql`truncate traders, trader_days`);
    await db.insert(traders).values([
      { accountId: "a", name: "Alice" },
      { accountId: "b", name: "Bob" },
      { accountId: "few", name: "Few" },
      { accountId: "bot", name: "Bot" },
      { accountId: "hidden", name: "Hidden", optedOut: true },
    ]);
    await db.insert(traderDays).values([
      // previous week (2026-10-05) decides the pool for 2026-10-12
      day("2026-10-05", "a", 0, 10, 8),
      day("2026-10-05", "a", 1, 10, 7),
      day("2026-10-05", "b", 0, 20, 9),
      day("2026-10-05", "few", 0, 4, 10), // under 5 trades
      day("2026-10-05", "bot", 0, 3001, 10), // over 3000 trades
      day("2026-10-05", "hidden", 0, 50, 10),
      // the league week itself must not leak into the cards
      day("2026-10-12", "b", 0, 500, 10),
    ]);
  });
  afterAll(async () => {
    await conn.end();
  });

  it("uses the previous week only, applies the trade limits, and ranks by points", async () => {
    const pool = await draftPool(db, "2026-10-12");
    expect(pool.map((p) => p.accountId)).toEqual(["a", "b"]);
    expect(pool[0]?.prevWeek).toMatchObject({ points: 15, trades: 20, activeDays: 2, winRate: 50 });
    expect(pool[0]).toMatchObject({ rating: 99, tier: "legend" });
    expect(pool[1]).toMatchObject({ rating: 55, tier: "bronze" });
    expect(pool[1]?.prevWeek.trades).toBe(20); // not the 500 from the league week
  });

  it("lists playable weeks with their status and pool size", async () => {
    const weeks = await playableWeeks(db, new Date("2026-10-21T12:00:00Z"));
    expect(weeks).toEqual([
      expect.objectContaining({ id: "2026-10-12", status: "final", draftable: 2 }),
      expect.objectContaining({ id: "2026-10-19", status: "live", draftable: 1 }),
    ]);
  });
});
