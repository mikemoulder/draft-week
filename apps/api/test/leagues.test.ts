import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import type { LeagueState, PoolTrader, SquadRequest } from "@draftweek/shared";
import { createApp } from "../src/app.js";
import { createDb } from "../src/db/client.js";
import { traderDays, traders, users } from "../src/db/schema.js";
import { createAuthService } from "../src/domain/auth/service.js";
import { createLeagueService, type Viewer } from "../src/domain/leagues/service.js";
import { createShowcase } from "../src/domain/leagues/showcase.js";
import { draftPool } from "../src/domain/traders/pool.js";

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("leagues", () => {
  const { sql: conn, db } = createDb(url ?? "postgres://unused");
  let clock = new Date("2026-10-21T12:00:00Z"); // week 2026-10-12 is finished: replay leagues
  // Alice's Strike account traded $60,000 in the last 7 days: +35 credits.
  const strike = { leaderboardFor: async (ids: string[]) => ids.map((id) => ({ account_id: id, volume: id === "alice-strike" ? 60_000 : 0 })) };
  const leagues = createLeagueService(db, { now: () => clock, strike: strike as never });
  let alice: Viewer;
  let bob: Viewer;
  let carol: Viewer;
  let pool: PoolTrader[];

  const must = <T>(r: { ok: true; value: T } | { ok: false; error: string }): T => {
    if (!r.ok) throw new Error(`expected ok, got: ${r.error}`);
    return r.value;
  };
  const err = (r: { ok: boolean; status?: number }) => (r.ok ? 200 : r.status);
  /** The five cheapest traders, so the squad always fits the base budget. */
  const cheapSquad = (offset = 0): SquadRequest => {
    const ids = [...pool].sort((a, b) => a.price - b.price).slice(offset, offset + 5).map((t) => t.accountId);
    return { captainId: ids[0]!, starters: ids.slice(0, 3), bench: ids.slice(3) };
  };
  const pricey = (): SquadRequest => {
    const ids = [...pool].sort((a, b) => b.price - a.price).slice(0, 5).map((t) => t.accountId);
    return { captainId: ids[0]!, starters: ids.slice(0, 3), bench: ids.slice(3) };
  };

  const POOL = Array.from({ length: 48 }, (_, i) => `t${String(i).padStart(2, "0")}`);
  const row = (weekId: string, accountId: string, day: number, points: number, liquidations = 0) => ({
    weekId,
    accountId,
    day,
    pnl: points,
    trades: 10,
    closes: 10,
    wins: 5,
    liquidations,
    firstLiquidationAt: liquidations ? new Date("2026-10-13T09:00:00Z") : null,
    avgLeverage: 10,
    equityRef: 1000,
    points,
    scoringVersion: 1,
  });

  beforeAll(async () => {
    await migrate(db, { migrationsFolder: "drizzle" });
  });

  beforeEach(async () => {
    clock = new Date("2026-10-21T12:00:00Z");
    await db.execute(sql`truncate users, wallets, sessions, auth_challenges, leagues, league_members, squads, traders, trader_days cascade`);
    const [a, b, c] = await db
      .insert(users)
      .values([{ displayName: "alice", strikeAccountId: "alice-strike", strikeAddress: "addr1alice" }, { displayName: "bob" }, { displayName: "carol" }])
      .returning();
    alice = { userId: a!.id, displayName: "alice" };
    bob = { userId: b!.id, displayName: "bob" };
    carol = { userId: c!.id, displayName: "carol" };

    await db.insert(traders).values(POOL.map((accountId) => ({ accountId, name: accountId.toUpperCase() })));
    await db.insert(traderDays).values([
      // the weeks before 2026-10-12 and 2026-10-26 price the pool: 48 traders
      ...POOL.map((a, i) => row("2026-10-05", a, 0, 48 - i)),
      ...POOL.map((a, i) => row("2026-10-19", a, 0, 48 - i)),
      // the replay week: everyone trades Monday, t01 is liquidated Tuesday
      ...POOL.map((a, i) => row("2026-10-12", a, 0, (i % 10) + 1)),
      row("2026-10-12", "t01", 1, -4, 1),
    ]);
    pool = await draftPool(db, "2026-10-12");
  });

  afterAll(async () => {
    await conn.end();
  });

  it("prices every trader between 20 and 60 credits and grades them", () => {
    expect(Math.max(...pool.map((t) => t.price))).toBe(60);
    expect(Math.min(...pool.map((t) => t.price))).toBe(20);
    expect(new Set(pool.map((t) => t.grade)).size).toBeGreaterThan(1);
  });

  it("runs a replay league: pick within budget, play, and score against bots", async () => {
    let s = must(await leagues.create(alice, { name: "Office league", weekId: "2026-10-12" }));
    expect(s).toMatchObject({ status: "picking", replay: true, squads: [], matchups: [] });
    expect(s.members).toEqual([expect.objectContaining({ name: "alice", budget: 235, bonus: 35, hasSquad: false })]);
    expect(s.inviteCode).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);

    expect(err(await leagues.play(alice, s.id))).toBe(409); // no squad yet
    s = must(await leagues.setSquad(alice, s.id, cheapSquad()));
    expect(s.squads).toEqual([expect.objectContaining({ memberId: s.myMemberId, spent: expect.any(Number) })]);
    expect(s.squads[0]!.spent).toBeLessThanOrEqual(235);

    s = must(await leagues.play(alice, s.id));
    expect(s).toMatchObject({ status: "final", daysRevealed: 7 });
    expect(s.members).toHaveLength(8);
    expect(s.members.every((m) => m.hasSquad)).toBe(true);
    expect(s.squads).toHaveLength(8); // everyone's squad is visible once the week is played
    expect(s.matchups).toHaveLength(4);
    expect(s.standings).toHaveLength(8);
    expect(s.traders.length).toBeGreaterThan(0);
    expect(err(await leagues.setSquad(alice, s.id, cheapSquad(1)))).toBe(409); // locked

    expect(await leagues.mine(alice)).toEqual([expect.objectContaining({ id: s.id, status: "final", members: 8 })]);
  });

  it("enforces the budget, the captain rule and this week's list", async () => {
    const s = must(await leagues.create(bob, { name: "Rules", weekId: "2026-10-12" }));
    expect(s.members[0]).toMatchObject({ budget: 200, bonus: 0 }); // bob has no Strike account
    const tooDear = await leagues.setSquad(bob, s.id, pricey());
    expect(tooDear).toMatchObject({ ok: false, status: 400 });
    expect((tooDear as { error: string }).error).toMatch(/your budget is 200/);
    const sq = cheapSquad();
    expect(err(await leagues.setSquad(bob, s.id, { ...sq, captainId: sq.bench[0]! }))).toBe(400);
    expect(err(await leagues.setSquad(bob, s.id, { ...sq, starters: [sq.starters[0]!, sq.starters[1]!, "not-a-trader"] }))).toBe(400);
  });

  it("lets friends join, pick the same traders, and see only their own squad until kick-off", async () => {
    const created = must(await leagues.create(alice, { name: "Friends", weekId: "2026-10-12" }));
    must(await leagues.setSquad(alice, created.id, cheapSquad()));
    expect(err(await leagues.state(created.id, bob))).toBe(403);

    let b = must(await leagues.join(bob, created.inviteCode.toLowerCase()));
    expect(b.members.map((m) => [m.name, m.seat])).toEqual([
      ["alice", 0],
      ["bob", 1],
    ]);
    b = must(await leagues.setSquad(bob, created.id, cheapSquad())); // same five as alice: allowed
    expect(b.squads.map((x) => x.memberId)).toEqual([b.myMemberId]);

    expect(err(await leagues.play(bob, created.id))).toBe(403); // owner only
    must(await leagues.play(alice, created.id));
    expect(err(await leagues.join(carol, created.inviteCode))).toBe(409);
    expect(err(await leagues.join(carol, "NOPE1234"))).toBe(404);
  });

  it("locks a calendar league at the start of its week and fills it with bots", async () => {
    const s = must(await leagues.create(alice, { name: "Next week", weekId: "2026-10-26" }));
    expect(s).toMatchObject({ status: "picking", replay: false });
    must(await leagues.setSquad(alice, s.id, cheapSquad()));
    clock = new Date("2026-10-27T12:00:00Z"); // Tuesday of that week
    const live = must(await leagues.state(s.id, alice));
    expect(live).toMatchObject({ status: "live", daysRevealed: 2 });
    expect(live.members).toHaveLength(8);
    expect(err(await leagues.setSquad(alice, s.id, cheapSquad(1)))).toBe(409);
    const [{ n }] = (await db.execute(sql`select count(*)::int as n from squads`)) as unknown as [{ n: number }];
    expect(n).toBe(8);
  });

  it("refuses the week in progress and weeks without data", async () => {
    expect(err(await leagues.create(alice, { name: "Now", weekId: "2026-10-19" }))).toBe(400);
    expect(err(await leagues.create(alice, { name: "Old", weekId: "2025-01-06" }))).toBe(400);
  });

  it("builds last week's game of the week from real data, without storing anything", async () => {
    const showcase = createShowcase(db, { now: () => clock });
    const first = await showcase.get();
    expect(first).not.toBeNull();
    const { league, featuredMatchupId, stats } = first!;
    expect(league).toMatchObject({ weekId: "2026-10-12", status: "final", daysRevealed: 7, myMemberId: null });
    expect(league.squads).toHaveLength(8);
    expect(league.matchups.map((m) => m.id)).toContain(featuredMatchupId);
    expect(stats.tradersFollowed).toBe(48);
    const again = await createShowcase(db, { now: () => clock }).get();
    expect(again?.league.squads).toEqual(league.squads);
    const [{ n }] = (await db.execute(sql`select count(*)::int as n from leagues`)) as unknown as [{ n: number }];
    expect(n).toBe(0);
  });

  it("requires a session over HTTP", async () => {
    const app = createApp({
      proxySecret: "s".repeat(40),
      version: "test",
      pingDb: async () => true,
      lastIngestAt: async () => null,
      auth: createAuthService(db, { origin: "https://draft-week.vercel.app" }),
      db,
      leagues,
    });
    const h = { "x-proxy-secret": "s".repeat(40) };
    expect((await app.request("/leagues", { headers: h })).status).toBe(401);
    expect((await app.request("/weeks/2026-10-12/traders/t00", { headers: h })).status).toBe(200);
    expect((await app.request("/weeks/2026-10-12/traders/nobody", { headers: h })).status).toBe(404);
    // bob's user row has no Strike link
    const [bobRow] = await db.select().from(users).where(eq(users.displayName, "bob"));
    expect(bobRow?.strikeAccountId).toBeNull();
  });

  it("joins a friend's league by invite code over HTTP", async () => {
    const app = createApp({
      proxySecret: "s".repeat(40),
      version: "test",
      pingDb: async () => true,
      lastIngestAt: async () => null,
      auth: createAuthService(db, { origin: "https://strike-ftl.vercel.app" }),
      db,
      leagues,
    });
    const guest = async () => {
      const res = await app.request("/auth/guest", { method: "POST", headers: { "x-proxy-secret": "s".repeat(40) } });
      return { "x-proxy-secret": "s".repeat(40), "content-type": "application/json", cookie: (res.headers.get("set-cookie") ?? "").split(";")[0]! };
    };
    const [owner, friend] = [await guest(), await guest()];
    const created = await app.request("/leagues", { method: "POST", headers: owner, body: JSON.stringify({ name: "Group chat", weekId: "2026-10-26" }) });
    expect(created.status).toBe(200);
    const { id, inviteCode } = (await created.json()) as LeagueState;

    const joined = await app.request("/leagues/join", { method: "POST", headers: friend, body: JSON.stringify({ inviteCode: inviteCode.toLowerCase() }) });
    expect(joined.status).toBe(200);
    expect(((await joined.json()) as LeagueState).id).toBe(id);
    const seen = (await (await app.request(`/leagues/${id}`, { headers: owner })).json()) as LeagueState;
    expect(seen.members).toHaveLength(2);
    expect((await app.request("/leagues/not-a-uuid", { headers: owner })).status).toBe(404);
  });
});
