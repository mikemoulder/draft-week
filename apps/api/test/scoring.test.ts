import { describe, expect, it } from "vitest";
import { addWeeks, dayOfWeek, isWeekId, weekBounds, weekIdOf } from "../src/domain/scoring/weeks.js";
import { scoreDay, type DayStat } from "../src/domain/scoring/points.js";

describe("weeks", () => {
  it("starts on Monday 00:00 UTC", () => {
    expect(weekIdOf(new Date("2026-10-21T19:00:00Z"))).toBe("2026-10-19"); // Wednesday
    expect(weekIdOf(new Date("2026-10-19T00:00:00Z"))).toBe("2026-10-19"); // Monday midnight
    expect(weekIdOf(new Date("2026-10-18T23:59:59Z"))).toBe("2026-10-12"); // Sunday night
  });

  it("validates ids and moves between weeks", () => {
    expect(isWeekId("2026-10-12")).toBe(true);
    expect(isWeekId("2026-10-13")).toBe(false); // a Tuesday
    expect(isWeekId("nope")).toBe(false);
    expect(addWeeks("2026-10-12", -1)).toBe("2026-10-05");
    expect(weekBounds("2026-10-12").end.toISOString()).toBe("2026-10-19T00:00:00.000Z");
  });

  it("maps timestamps to day 0..6", () => {
    expect(dayOfWeek("2026-10-12", new Date("2026-10-12T00:00:00Z"))).toBe(0);
    expect(dayOfWeek("2026-10-12", new Date("2026-10-18T23:59:59Z"))).toBe(6);
  });
});

const stat = (accountId: string, pnl: number, extra: Partial<DayStat> = {}): DayStat => ({
  accountId,
  pnl,
  trades: 1,
  liquidations: 0,
  equityRef: 1000,
  ...extra,
});

describe("scoreDay", () => {
  it("gives 1..10 by return decile among traders who traded", () => {
    const stats = Array.from({ length: 10 }, (_, i) => stat(`t${i}`, (i - 5) * 10));
    const points = scoreDay(stats);
    expect(points.get("t0")).toBe(1);
    expect(points.get("t9")).toBe(10);
  });

  it("ranks by return, not dollars, so a small account can beat a whale", () => {
    const points = scoreDay([
      stat("whale", 500, { equityRef: 100_000 }), // +0.5%
      stat("minnow", 50, { equityRef: 200 }), // +25%
    ]);
    expect(points.get("minnow")).toBeGreaterThan(points.get("whale") ?? 0);
  });

  it("scores 0 for no trades and subtracts 5 for a liquidation", () => {
    const points = scoreDay([stat("idle", 0, { trades: 0 }), stat("rekt", -90, { liquidations: 2 }), stat("ok", 10)]);
    expect(points.get("idle")).toBe(0);
    expect(points.get("rekt")).toBe(1 - 5);
  });

  it("floors tiny equity at 100 and is deterministic on ties", () => {
    const a = scoreDay([stat("b", 5, { equityRef: 1 }), stat("a", 5, { equityRef: 1 })]);
    const b = scoreDay([stat("a", 5, { equityRef: 1 }), stat("b", 5, { equityRef: 1 })]);
    expect([...a.entries()].sort()).toEqual([...b.entries()].sort());
  });
});
