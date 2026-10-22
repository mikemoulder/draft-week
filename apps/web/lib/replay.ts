// Turns a scored league into what the scoreboard shows: per day, which three traders counted for
// a manager (after auto-subs), their points (captain x1.5), and running totals.
import type { LeagueState, Matchup } from "@draftweek/shared";

export const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;

export type Chip = {
  accountId: string;
  name: string;
  points: number | null; // null: did not trade and nobody on the bench did either
  captain: boolean;
  liquidated: boolean;
  sub: boolean;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

export function traderName(league: LeagueState, accountId: string): string {
  return league.traders.find((t) => t.accountId === accountId)?.name ?? accountId.slice(0, 8);
}

export function memberName(league: LeagueState, memberId: string): string {
  return league.members.find((m) => m.id === memberId)?.name ?? "Manager";
}

export function lineupDays(league: LeagueState, memberId: string): Chip[][] {
  const lineup = league.squads.find((l) => l.memberId === memberId);
  if (!lineup) return DAYS.map(() => []);
  const points = new Map(league.points.map((p) => [`${p.accountId}:${p.day}`, p]));
  const subs = league.matchups
    .flatMap((m) => m.events)
    .filter((e): e is Extract<typeof e, { kind: "autosub" }> => e.kind === "autosub" && e.memberId === memberId);

  return DAYS.map((_, day) =>
    lineup.starters.map((starter) => {
      const sub = subs.find((s) => s.day === day && s.out === starter);
      const id = sub ? sub.in : starter;
      const p = points.get(`${id}:${day}`);
      const captain = id === lineup.captainId;
      return {
        accountId: id,
        name: traderName(league, id),
        points: p ? round1(p.points * (captain ? 1.5 : 1)) : null,
        captain,
        liquidated: p?.liquidated ?? false,
        sub: Boolean(sub),
      };
    }),
  );
}

/** Running totals after `days` days. */
export function totals(m: Matchup, days: number): [number, number] {
  return m.daily.slice(0, days).reduce<[number, number]>(([a, b], [x, y]) => [round1(a + x), round1(b + y)], [0, 0]);
}

export function leadChangeDays(m: Matchup): number[] {
  return m.events.filter((e) => e.kind === "leadChange").map((e) => e.day);
}
