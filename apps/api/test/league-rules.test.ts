import { describe, expect, it } from "vitest";
import type { PoolTrader } from "@draftweek/shared";
import {
  botChoice,
  daysRevealed,
  defaultLineup,
  leagueStatus,
  lineupError,
  pairings,
  scoreLeague,
  scoreLineupDay,
  seatForPick,
  totalPicks,
  type PointsBook,
  type TraderDay,
} from "../src/domain/leagues/rules.js";

const trader = (accountId: string, points: number, activeDays = 5): PoolTrader => ({
  accountId,
  name: accountId,
  style: "steady",
  prevWeek: { points, pnl: 0, trades: 20, activeDays, winRate: 50, liquidations: 0 },
});

describe("draft order", () => {
  it("snakes: 0..7 then 7..0", () => {
    const order = Array.from({ length: 16 }, (_, p) => seatForPick(p, 8));
    expect(order).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 7, 6, 5, 4, 3, 2, 1, 0]);
    expect(totalPicks(8)).toBe(40);
  });

  it("bots pick strong, active traders and are reproducible", () => {
    const pool = [trader("weak", 2, 1), trader("ok", 20), trader("star", 60), trader("good", 45)];
    const pick = botChoice(pool, "league-1:0");
    expect(["star", "good", "ok"]).toContain(pick?.accountId);
    expect(botChoice(pool, "league-1:0")?.accountId).toBe(pick?.accountId);
    expect(botChoice([], "x")).toBeNull();
  });
});

describe("lineups", () => {
  const roster = ["a", "b", "c", "d", "e"];

  it("starts the best three by last week and captains the best", () => {
    const prev = new Map([["a", 1], ["b", 9], ["c", 5], ["d", 7], ["e", 3]]);
    expect(defaultLineup(roster, prev)).toEqual({ captainId: "b", starters: ["b", "d", "c"], bench: ["e", "a"] });
  });

  it("rejects lineups that break the rules", () => {
    expect(lineupError({ captainId: "a", starters: ["a", "b", "c"], bench: ["d", "e"] }, roster)).toBeNull();
    expect(lineupError({ captainId: "d", starters: ["a", "b", "c"], bench: ["d", "e"] }, roster)).toMatch(/captain/);
    expect(lineupError({ captainId: "a", starters: ["a", "a", "c"], bench: ["d", "e"] }, roster)).toMatch(/one slot/);
    expect(lineupError({ captainId: "a", starters: ["a", "b", "x"], bench: ["d", "e"] }, roster)).toMatch(/drafted/);
    expect(lineupError({ captainId: "a", starters: ["a", "b"], bench: ["c", "d", "e"] }, roster)).toMatch(/3 starters/);
  });
});

describe("league status", () => {
  const week = "2026-10-12"; // Mon Oct 12 to Mon Oct 19
  const at = (s: string) => new Date(s);

  it("moves through setup, drafting, ready, live and final for a league drafted before the week", () => {
    const base = { weekId: week, draftStartedAt: null, draftCompletedAt: null, playedAt: null };
    expect(leagueStatus(base, at("2026-10-10T00:00:00Z"))).toBe("setup");
    const started = { ...base, draftStartedAt: at("2026-10-10T00:00:00Z") };
    expect(leagueStatus(started, at("2026-10-10T01:00:00Z"))).toBe("drafting");
    const drafted = { ...started, draftCompletedAt: at("2026-10-10T02:00:00Z") };
    expect(leagueStatus(drafted, at("2026-10-11T00:00:00Z"))).toBe("ready");
    expect(leagueStatus(drafted, at("2026-10-14T00:00:00Z"))).toBe("live");
    expect(leagueStatus(drafted, at("2026-10-20T00:00:00Z"))).toBe("final");
  });

  it("holds a replay league at ready until the owner plays it", () => {
    const replay = { weekId: week, draftStartedAt: at("2026-10-21T00:00:00Z"), draftCompletedAt: at("2026-10-21T00:10:00Z"), playedAt: null };
    expect(leagueStatus(replay, at("2026-10-21T01:00:00Z"))).toBe("ready");
    expect(leagueStatus({ ...replay, playedAt: at("2026-10-21T01:00:00Z") }, at("2026-10-21T01:00:01Z"))).toBe("final");
  });

  it("reveals days up to today while live, all when final, none otherwise", () => {
    expect(daysRevealed("live", week, at("2026-10-14T12:00:00Z"))).toBe(3); // Wednesday
    expect(daysRevealed("final", week, at("2026-10-14T12:00:00Z"))).toBe(7);
    expect(daysRevealed("ready", week, at("2026-10-14T12:00:00Z"))).toBe(0);
  });
});

describe("scoring a lineup", () => {
  const lineup = { captainId: "a", starters: ["a", "b", "c"], bench: ["d", "e"] };
  const book: PointsBook = new Map<string, Map<number, TraderDay>>([
    ["a", new Map([[0, { points: 8, liquidations: 0, firstLiquidationAt: null }]])],
    ["b", new Map([[0, { points: 4, liquidations: 1, firstLiquidationAt: new Date(1000) }]])],
    // c did not trade on day 0
    ["d", new Map([[0, { points: 6, liquidations: 0, firstLiquidationAt: null }]])],
    ["e", new Map([[0, { points: 9, liquidations: 0, firstLiquidationAt: null }]])],
  ]);

  it("doubles nothing but the captain (x1.5) and auto-subs the first active bench player", () => {
    const r = scoreLineupDay(lineup, book, 0);
    expect(r.points).toBe(8 * 1.5 + 4 + 6);
    expect(r.subs).toEqual([{ out: "c", in: "d" }]);
    expect(r.liquidated).toEqual([{ accountId: "b", at: 1000 }]);
  });

  it("scores zero for a starter when nobody on the bench traded either", () => {
    expect(scoreLineupDay(lineup, book, 1)).toMatchObject({ points: 0, counted: [], subs: [] });
  });

  it("pairs seats from the outside in and finds lead changes", () => {
    expect(pairings([0, 1, 2, 3, 4, 5, 6, 7])).toEqual([[0, 7], [1, 6], [2, 5], [3, 4]]);
    const lu = (id: string) => ({ captainId: id, starters: [id, `${id}2`, `${id}3`], bench: [`${id}4`, `${id}5`] });
    const dayBook = (pts: number[]) => new Map(pts.map((p, d) => [d, { points: p, liquidations: 0, firstLiquidationAt: null }]));
    const twoDayBook: PointsBook = new Map([
      ["x", dayBook([10, 1])],
      ["y", dayBook([2, 20])],
    ]);
    const { matchups, standings } = scoreLeague(
      [
        { memberId: "mx", seat: 0, lineup: lu("x") },
        { memberId: "my", seat: 1, lineup: lu("y") },
      ],
      twoDayBook,
      2,
    );
    expect(matchups[0]?.daily).toEqual([[15, 3], [1.5, 30]]);
    expect(matchups[0]?.events).toContainEqual({ kind: "leadChange", day: 1, matchupId: "mx:my", leaderId: "my" });
    expect(standings.map((s) => s.memberId)).toEqual(["my", "mx"]);
  });
});
