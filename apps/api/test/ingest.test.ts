// Ingest end to end against Postgres with a fake Strike that pages exactly like the real one:
// fillsBefore = newest first below fromId within startTime, fillsSince = ascending above a trade id.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { and, eq, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createDb } from "../src/db/client.js";
import { fills, ingestState, traderDays, traderEquity, traders } from "../src/db/schema.js";
import { runIngest } from "../src/domain/ingest/run.js";
import type { LeaderboardEntry, StrikeClient, StrikeFill } from "../src/strike.js";

const url = process.env.TEST_DATABASE_URL;
const NOW = new Date("2026-10-21T12:00:00Z"); // Wednesday; current week 2026-10-19; backfill from 2026-10-05

type FakeStrike = StrikeClient & { board: LeaderboardEntry[]; fills: Map<string, StrikeFill[]>; failFor: Set<string> };

function fakeStrike(): FakeStrike {
  const board: LeaderboardEntry[] = [];
  const store = new Map<string, StrikeFill[]>();
  const failFor = new Set<string>();
  const of = (id: string) => {
    if (failFor.has(id)) throw new Error("strike 503 on /v2/history/fill");
    return store.get(id) ?? [];
  };
  return {
    board,
    fills: store,
    failFor,
    async leaderboard(q) {
      return { total: board.length, entries: board.slice(q.offset, q.offset + q.limit) };
    },
    async fillsBefore(id, q) {
      return of(id)
        .filter((f) => f.timestamp >= q.startTime && (q.fromId === undefined || f.id < q.fromId))
        .sort((a, b) => b.id - a.id)
        .slice(0, q.limit ?? 1000);
    },
    async accountByAddress() {
      return null;
    },
    async leaderboardFor() {
      return [];
    },
    async fillsSince(id, since, limit = 1000) {
      return of(id)
        .filter((f) => f.trade_id > since)
        .sort((a, b) => a.trade_id - b.trade_id)
        .slice(0, limit);
    },
  };
}

let seq = 1;
function fill(accountId: string, at: string, pnl: number, extra: Partial<StrikeFill> = {}): StrikeFill {
  const n = seq++;
  return {
    id: n,
    trade_id: n,
    order_id: 10_000 + n,
    account_id: accountId,
    symbol: "BTC-USD",
    side: "sell",
    role: "taker",
    price: 84_000,
    size: 0.01,
    realized_pnl: pnl,
    fee: 0.5,
    leverage: 10,
    auto_close_type: "",
    client_order_id: null,
    timestamp: new Date(at).getTime(),
    ...extra,
  };
}

const entry = (account_id: string, total_trades: number, extra: Partial<LeaderboardEntry> = {}): LeaderboardEntry => ({
  account_id,
  nickname: null,
  ada_handle: null,
  blockchain_address: null,
  vault_id: null,
  equity: 1000,
  volume: null,
  total_trades,
  ...extra,
});

describe.skipIf(!url)("ingest", () => {
  const { sql: conn, db } = createDb(url ?? "postgres://unused");
  let strike: FakeStrike;
  const run = (discover = true, now = NOW) => runIngest({ db, sql: conn, strike }, { now, discover });

  beforeAll(async () => {
    await migrate(db, { migrationsFolder: "drizzle" });
  });
  beforeEach(async () => {
    seq = 1;
    strike = fakeStrike();
    await db.execute(sql`truncate traders, trader_equity, fills, ingest_state, ingest_runs, trader_days`);
  });
  afterAll(async () => {
    await conn.end();
  });

  it("discovers draftable traders only, names them, and records equity", async () => {
    strike.board.push(
      entry("alice", 120, { nickname: "Alice" }),
      entry("bob", 40, { ada_handle: "bobby" }),
      entry("carol", 9, { blockchain_address: "addr1qyhky3efqxgdcau6ll2ldcdq83jg5z6kkr7mdf0h7sd4e2y3x6vktdvqekhazmchqqt4cn6j7np0xrp7qktueejj0e4q0mn2ms" }),
      entry("dave", 9),
      entry("vault_slp", 900_000),
      entry("mm-bot", 50_000),
      entry("idle", 0),
    );
    await run();
    const rows = await db.select().from(traders).orderBy(traders.accountId);
    expect(rows.map((r) => [r.accountId, r.name])).toEqual([
      ["alice", "Alice"],
      ["bob", "$bobby"],
      ["carol", "addr1qyh…mn2ms"],
      ["dave", "trader-dave"],
    ]);
    expect(await db.select().from(traderEquity)).toHaveLength(4);
  });

  it("backfills two weeks, ignores older fills, and scores each day", async () => {
    strike.board.push(entry("alice", 3), entry("bob", 2));
    strike.fills.set("alice", [
      fill("alice", "2026-09-30T10:00:00Z", 100), // before the backfill window
      fill("alice", "2026-10-12T10:00:00Z", 100), // Monday of week 2026-10-12
      fill("alice", "2026-10-13T10:00:00Z", -20, { auto_close_type: "liquidation", order_id: 1 }),
      fill("alice", "2026-10-13T10:00:01Z", -20, { auto_close_type: "liquidation", order_id: 1 }),
    ]);
    strike.fills.set("bob", [fill("bob", "2026-10-12T15:00:00Z", 5)]);

    const summary = await run();
    expect(summary).toMatchObject({ skipped: false, inserted: 4, errors: 0 });

    const week = await db.select().from(traderDays).where(eq(traderDays.weekId, "2026-10-12"));
    const monday = week.filter((r) => r.day === 0);
    // Alice made +99.5 on 1000, Bob +4.5 on 1000: Alice ranks above Bob
    expect(monday.find((r) => r.accountId === "alice")?.points).toBeGreaterThan(monday.find((r) => r.accountId === "bob")?.points ?? 99);
    const tuesday = week.find((r) => r.accountId === "alice" && r.day === 1);
    // two fills of one liquidation order count as one liquidation; sole trader that day = 1 point, minus 5
    expect(tuesday).toMatchObject({ trades: 2, liquidations: 1, points: 1 - 5 });
  });

  it("polls only new fills after the first run, and reruns are idempotent", async () => {
    strike.board.push(entry("alice", 2));
    strike.fills.set("alice", [fill("alice", "2026-10-20T10:00:00Z", 10)]);
    await run();

    strike.fills.get("alice")?.push(fill("alice", "2026-10-21T09:00:00Z", 30));
    const second = await run(false);
    expect(second).toMatchObject({ inserted: 1 });

    const again = await run(false);
    expect(again).toMatchObject({ inserted: 0 });
    const days = await db.select().from(traderDays).where(eq(traderDays.weekId, "2026-10-19"));
    // Oct 20 is the Tuesday (day 1) and Oct 21 the Wednesday (day 2) of week 2026-10-19
    expect(days.map((d) => d.day).sort()).toEqual([1, 2]);
    const [state] = await db.select().from(ingestState).where(eq(ingestState.accountId, "alice"));
    expect(state?.lastTradeId).toBe(2);
  });

  it("pages through more than 1000 fills on backfill", async () => {
    strike.board.push(entry("busy", 2500));
    strike.fills.set(
      "busy",
      Array.from({ length: 2500 }, (_, i) => fill("busy", new Date(Date.parse("2026-10-14T00:00:00Z") + i * 60_000).toISOString(), 1)),
    );
    await run();
    const [{ n }] = (await db.execute(sql`select count(*)::int as n from fills where account_id = 'busy'`)) as unknown as [{ n: number }];
    expect(n).toBe(2500);
  });

  it("keeps going when one trader fails, and records why", async () => {
    strike.board.push(entry("alice", 1), entry("broken", 1));
    strike.fills.set("alice", [fill("alice", "2026-10-20T10:00:00Z", 1)]);
    strike.failFor.add("broken");
    const summary = await run();
    expect(summary).toMatchObject({ inserted: 1, errors: 1 });
    const [state] = await db.select().from(ingestState).where(eq(ingestState.accountId, "broken"));
    expect(state?.lastError).toMatch(/503/);
  });

  it("skips a run while another one holds the lock", async () => {
    const other = await conn.reserve();
    await other`select pg_advisory_lock(7340211)`;
    try {
      expect(await run()).toEqual({ skipped: true });
    } finally {
      await other`select pg_advisory_unlock(7340211)`;
      other.release();
    }
    const [{ n }] = (await db.execute(sql`select count(*)::int as n from ingest_runs`)) as unknown as [{ n: number }];
    expect(n).toBe(0);
  });

  it("excludes copy-trade flags and keeps raw values", async () => {
    strike.board.push(entry("alice", 1));
    strike.fills.set("alice", [fill("alice", "2026-10-20T10:00:00Z", 1, { client_order_id: "copy:abc:1", leverage: 25 })]);
    await run();
    const [row] = await db.select().from(fills).where(and(eq(fills.accountId, "alice")));
    expect(row).toMatchObject({ isCopy: true, leverage: 25, realizedPnl: 1, fee: 0.5 });
  });
});
