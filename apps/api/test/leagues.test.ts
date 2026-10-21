import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import type { LeagueState } from "@draftweek/shared";
import { createApp } from "../src/app.js";
import { createDb } from "../src/db/client.js";
import { traderDays, traders, users } from "../src/db/schema.js";
import { createAuthService } from "../src/domain/auth/service.js";
import { createLeagueService, type Viewer } from "../src/domain/leagues/service.js";
import { createShowcase } from "../src/domain/leagues/showcase.js";

const url = process.env.TEST_DATABASE_URL;
const NOW = new Date("2026-10-21T12:00:00Z"); // week 2026-10-12 is finished: replay leagues

describe.skipIf(!url)("leagues", () => {
  const { sql: conn, db } = createDb(url ?? "postgres://unused");
  const leagues = createLeagueService(db, { now: () => NOW });
  let alice: Viewer;
  let bob: Viewer;
  let carol: Viewer;

  const must = <T>(r: { ok: true; value: T } | { ok: false; error: string }): T => {
    if (!r.ok) throw new Error(`expected ok, got: ${r.error}`);
    return r.value;
  };
  const err = (r: { ok: boolean; status?: number }) => (r.ok ? 200 : r.status);
  const myTurn = (s: LeagueState) => s.onTheClock === s.myMemberId;
  const available = (s: LeagueState, pool: string[]) => pool.find((a) => !s.picks.some((p) => p.accountId === a)) as string;

  const POOL = Array.from({ length: 48 }, (_, i) => `t${String(i).padStart(2, "0")}`);

  beforeAll(async () => {
    await migrate(db, { migrationsFolder: "drizzle" });
  });

  beforeEach(async () => {
    await db.execute(sql`truncate users, wallets, sessions, auth_challenges, leagues, league_members, picks, lineups, traders, trader_days cascade`);
    const [a, b, c] = await db.insert(users).values([{ displayName: "alice" }, { displayName: "bob" }, { displayName: "carol" }]).returning();
    alice = { userId: a!.id, displayName: "alice" };
    bob = { userId: b!.id, displayName: "bob" };
    carol = { userId: c!.id, displayName: "carol" };

    await db.insert(traders).values(POOL.map((accountId) => ({ accountId, name: accountId.toUpperCase() })));
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
    await db.insert(traderDays).values([
      // previous week: the pool (48 traders, 40 picks needed)
      ...POOL.map((a, i) => row("2026-10-05", a, 0, 48 - i)),
      // league week: everyone trades Monday, t01 is liquidated Tuesday
      ...POOL.map((a, i) => row("2026-10-12", a, 0, (i % 10) + 1)),
      row("2026-10-12", "t01", 1, -4, 1),
    ]);
  });

  afterAll(async () => {
    await conn.end();
  });

  it("runs a solo replay league from creation to final results", async () => {
    let s = must(await leagues.create(alice, { name: "Office league", weekId: "2026-10-12" }));
    expect(s).toMatchObject({ status: "setup", members: [{ name: "alice", seat: 0, isBot: false }], matchups: [] });
    expect(s.inviteCode).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);

    s = must(await leagues.startDraft(alice, s.id));
    expect(s.status).toBe("drafting");
    expect(s.members).toHaveLength(8);
    expect(s.members.filter((m) => m.isBot)).toHaveLength(7);
    expect(myTurn(s)).toBe(true); // seat 0 picks first

    // out-of-pool, then a real pick; bots then pick until alice is back on the clock (pick 15)
    expect(err(await leagues.pick(alice, s.id, "not-a-trader"))).toBe(400);
    s = must(await leagues.pick(alice, s.id, "t00"));
    expect(s.picks).toHaveLength(15);
    expect(myTurn(s)).toBe(true);
    expect(err(await leagues.pick(alice, s.id, "t00"))).toBe(409); // already drafted

    while (s.status === "drafting") s = must(await leagues.pick(alice, s.id, available(s, POOL)));
    expect(s.picks).toHaveLength(40);
    expect(new Set(s.picks.map((p) => p.accountId)).size).toBe(40);
    expect(s.status).toBe("ready");
    expect(s.lineups).toHaveLength(8);
    expect(s.daysRevealed).toBe(0);
    expect(s.matchups).toEqual([]); // nothing revealed before the week is played

    const mine = s.picks.filter((p) => p.memberId === s.myMemberId).map((p) => p.accountId);
    expect(err(await leagues.setLineup(alice, s.id, { captainId: mine[4]!, starters: mine.slice(0, 3), bench: mine.slice(3) }))).toBe(400);
    s = must(await leagues.setLineup(alice, s.id, { captainId: mine[1]!, starters: mine.slice(0, 3), bench: mine.slice(3) }));
    expect(s.lineups.find((l) => l.memberId === s.myMemberId)?.captainId).toBe(mine[1]);

    expect(err(await leagues.play(bob, s.id))).toBe(403);
    s = must(await leagues.play(alice, s.id));
    expect(s.status).toBe("final");
    expect(s.daysRevealed).toBe(7);
    expect(s.matchups).toHaveLength(4);
    expect(s.standings).toHaveLength(8);
    expect(s.points.length).toBeGreaterThan(0);
    expect(err(await leagues.setLineup(alice, s.id, { captainId: mine[0]!, starters: mine.slice(0, 3), bench: mine.slice(3) }))).toBe(409);

    const summaries = await leagues.mine(alice);
    expect(summaries).toEqual([expect.objectContaining({ id: s.id, status: "final", members: 8 })]);
  });

  it("lets friends join by invite before the draft, and not after", async () => {
    const created = must(await leagues.create(alice, { name: "Friends", weekId: "2026-10-12" }));
    expect(err(await leagues.state(created.id, bob))).toBe(403);

    const joined = must(await leagues.join(bob, created.inviteCode.toLowerCase()));
    expect(joined.members.map((m) => [m.name, m.seat])).toEqual([
      ["alice", 0],
      ["bob", 1],
    ]);
    expect(must(await leagues.join(bob, created.inviteCode)).members).toHaveLength(2); // joining twice is a no-op

    expect(err(await leagues.startDraft(bob, created.id))).toBe(403); // owner only
    must(await leagues.startDraft(alice, created.id));
    expect(err(await leagues.join(carol, created.inviteCode))).toBe(409);
    expect(err(await leagues.join(carol, "NOPE1234"))).toBe(404);
  });

  it("only lets the manager on the clock pick, even under concurrent requests", async () => {
    const s = must(await leagues.create(alice, { name: "Race", weekId: "2026-10-12" }));
    must(await leagues.join(bob, s.inviteCode));
    must(await leagues.startDraft(alice, s.id));

    expect(err(await leagues.pick(bob, s.id, "t05"))).toBe(409); // bob is seat 1, alice is up
    const results = await Promise.all([leagues.pick(alice, s.id, "t00"), leagues.pick(alice, s.id, "t01")]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok).map(err)).toEqual([409]);

    const after = must(await leagues.state(s.id, bob));
    expect(after.picks).toHaveLength(1);
    expect(after.onTheClock).toBe(after.myMemberId); // now bob's turn
  });

  it("builds last week's game of the week from real data, without storing anything", async () => {
    const showcase = createShowcase(db, { now: () => NOW });
    const first = await showcase.get();
    expect(first).not.toBeNull();
    const { league, featuredMatchupId, stats } = first!;
    expect(league).toMatchObject({ weekId: "2026-10-12", status: "final", daysRevealed: 7, myMemberId: null });
    expect(league.members).toHaveLength(8);
    expect(new Set(league.picks.map((p) => p.accountId)).size).toBe(40);
    expect(league.matchups.map((m) => m.id)).toContain(featuredMatchupId);
    expect(league.standings).toHaveLength(8);
    expect(stats.tradersFollowed).toBe(48);

    const again = await createShowcase(db, { now: () => NOW }).get();
    expect(again?.league.picks).toEqual(league.picks); // same week, same seeds, same league
    const [{ n }] = (await db.execute(sql`select count(*)::int as n from leagues`)) as unknown as [{ n: number }];
    expect(n).toBe(0);
  });

  it("refuses weeks that cannot host a league", async () => {
    expect(err(await leagues.create(alice, { name: "Old", weekId: "2025-01-06" }))).toBe(400);
  });

  it("requires a session and a valid id over HTTP", async () => {
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
    expect((await app.request("/leagues/not-a-uuid/start", { method: "POST", headers: h })).status).toBe(401);
  });
});
