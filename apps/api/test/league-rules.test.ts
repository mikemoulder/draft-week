import { describe, expect, it } from "vitest";
import type { PoolTrader } from "@draftweek/shared";
import {
  autoSquad,
  daysRevealed,
  defaultLineup,
  leagueStatus,
  pairings,
  scoreLeague,
  scoreLineupDay,
  squadCost,
  squadError,
  type PointsBook,
  type TraderDay,
} from "../src/domain/leagues/rules.js";
import { dealHand } from "../src/domain/leagues/showcase.js";

const trader = (accountId: string, points: number, activeDays = 5, price = 40): PoolTrader => ({
  accountId,
  name: accountId,
  style: "steady",
  rating: 70,
  tier: "silver",
  grade: "B",
  price,
  avatarUrl: null,
  prevWeek: { points, pnl: 0, returnPct: 0, trades: 20, activeDays, winRate: 50, liquidations: 0 },
});

describe("squads", () => {
  const roster = ["a", "b", "c", "d", "e"];
  const prices = new Map([["a", 60], ["b", 50], ["c", 40], ["d", 30], ["e", 20], ["f", 20]]);
  const squad = { captainId: "a", starters: ["a", "b", "c"], bench: ["d", "e"] };

  it("starts the best three by last week and captains the best", () => {
    const prev = new Map([["a", 1], ["b", 9], ["c", 5], ["d", 7], ["e", 3]]);
    expect(defaultLineup(roster, prev)).toEqual({ captainId: "b", starters: ["b", "d", "c"], bench: ["e", "a"] });
  });

  it("costs the sum of its prices and must fit the budget", () => {
    expect(squadCost(squad, prices)).toBe(200);
    expect(squadError(squad, prices, 200)).toBeNull();
    expect(squadError(squad, prices, 199)).toMatch(/costs 200 credits and your budget is 199/);
  });

  it("rejects squads that break the rules", () => {
    expect(squadError({ ...squad, captainId: "d" }, prices, 999)).toMatch(/captain/);
    expect(squadError({ ...squad, starters: ["a", "a", "c"] }, prices, 999)).toMatch(/once/);
    expect(squadError({ ...squad, starters: ["a", "b", "x"] }, prices, 999)).toMatch(/this week's list/);
    expect(squadError({ ...squad, starters: ["a", "b"], bench: ["c", "d", "e"] }, prices, 999)).toMatch(/3 starters/);
  });

  it("builds a sensible bot squad that always fits the budget and is reproducible", () => {
    const pool = Array.from({ length: 30 }, (_, i) => trader(`t${i}`, 60 - i * 2, 5, 49 - i));
    for (const budget of [150, 200, 250]) {
      const s = autoSquad(pool, budget, "league:bot-1");
      expect(s).not.toBeNull();
      expect(squadCost(s!, new Map(pool.map((t) => [t.accountId, t.price])))).toBeLessThanOrEqual(budget);
      expect(new Set([...s!.starters, ...s!.bench]).size).toBe(5);
    }
    expect(autoSquad(pool, 200, "same")).toEqual(autoSquad(pool, 200, "same"));
    expect(autoSquad(pool.slice(0, 4), 200, "x")).toBeNull();
  });
});

describe("league status", () => {
  const week = "2026-10-12"; // Mon Oct 12 to Mon Oct 19
  const at = (s: string) => new Date(s);

  it("is picking before the week, live during it and final after, for a league made in advance", () => {
    const l = { weekId: week, createdAt: at("2026-10-08T00:00:00Z"), playedAt: null };
    expect(leagueStatus(l, at("2026-10-11T00:00:00Z"))).toBe("picking");
    expect(leagueStatus(l, at("2026-10-14T00:00:00Z"))).toBe("live");
    expect(leagueStatus(l, at("2026-10-20T00:00:00Z"))).toBe("final");
  });

  it("holds a replay league at picking until the owner plays it", () => {
    const replay = { weekId: week, createdAt: at("2026-10-21T00:00:00Z"), playedAt: null };
    expect(leagueStatus(replay, at("2026-10-21T01:00:00Z"))).toBe("picking");
    expect(leagueStatus({ ...replay, playedAt: at("2026-10-21T01:00:00Z") }, at("2026-10-21T01:00:01Z"))).toBe("final");
  });

  it("reveals days up to today while live, all when final, none otherwise", () => {
    expect(daysRevealed("live", week, at("2026-10-14T12:00:00Z"))).toBe(3); // Wednesday
    expect(daysRevealed("final", week, at("2026-10-14T12:00:00Z"))).toBe(7);
    expect(daysRevealed("picking", week, at("2026-10-14T12:00:00Z"))).toBe(0);
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

  it("pairs managers with each other before bots", () => {
    const seats = (humans: number) => Array.from({ length: 8 }, (_, seat) => ({ seat, isBot: seat >= humans }));
    expect(pairings(seats(2))).toEqual([[0, 1], [2, 3], [4, 5], [6, 7]]);
    // three managers: the third meets the first bot
    expect(pairings(seats(3))[1]).toEqual([2, 3]);
    // join order wins over seat number when a manager took a later seat
    expect(pairings([{ seat: 0, isBot: false }, { seat: 1, isBot: true }, { seat: 5, isBot: false }, { seat: 7, isBot: true }])).toEqual([[0, 5], [1, 7]]);
    expect(pairings(seats(8))).toEqual([[0, 1], [2, 3], [4, 5], [6, 7]]);
  });

  it("scores matchups, finds lead changes and records the result", () => {
    const lu = (id: string) => ({ captainId: id, starters: [id, `${id}2`, `${id}3`], bench: [`${id}4`, `${id}5`] });
    const dayBook = (pts: number[]) => new Map(pts.map((p, d) => [d, { points: p, liquidations: 0, firstLiquidationAt: null }]));
    const twoDayBook: PointsBook = new Map([
      ["x", dayBook([10, 1])],
      ["y", dayBook([2, 20])],
    ]);
    const { matchups, standings } = scoreLeague(
      [
        { memberId: "mx", seat: 0, isBot: false, lineup: lu("x") },
        { memberId: "my", seat: 1, isBot: false, lineup: lu("y") },
      ],
      twoDayBook,
      2,
    );
    expect(matchups[0]?.daily).toEqual([[15, 3], [1.5, 30]]);
    expect(matchups[0]?.events).toContainEqual({ kind: "leadChange", day: 1, matchupId: "mx:my", leaderId: "my" });
    expect(standings).toEqual([
      { memberId: "my", points: 33, result: "W" },
      { memberId: "mx", points: 16.5, result: "L" },
    ]);
  });
});

describe("dealHand", () => {
  it("puts the best card in the middle and shows every style it can", () => {
    const pool = [
      { ...trader("s1", 60), style: "steady" as const, rating: 99, tier: "legend" as const },
      { ...trader("s2", 58), style: "steady" as const, rating: 98, tier: "legend" as const },
      { ...trader("d1", 40), style: "degen" as const, rating: 90, tier: "gold" as const },
      { ...trader("c1", 30), style: "scalper" as const, rating: 80, tier: "silver" as const },
      { ...trader("w1", 20), style: "swing" as const, rating: 70, tier: "silver" as const },
    ];
    const hand = dealHand(pool);
    expect(hand[2]?.accountId).toBe("s1");
    expect(new Set(hand.slice(0, 5).map((t) => t.style))).toEqual(new Set(["steady", "degen", "scalper", "swing"]));
  });
});

