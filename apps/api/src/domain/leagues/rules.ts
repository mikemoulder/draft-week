// Pure league rules. No database access here, so every rule is unit tested directly.
import type { LeagueStatus, Matchup, PoolTrader, ReplayEvent } from "@draftweek/shared";
import { DAY_MS, weekBounds } from "../scoring/weeks.js";

export const ROSTER_SIZE = 5;
export const STARTERS = 3;
export const BENCH = ROSTER_SIZE - STARTERS;
export const CAPTAIN_MULTIPLIER = 1.5;
export const LEAGUE_SIZE = 8;

export const BOT_NAMES = [
  "Margin Call Mike",
  "Funding Fiona",
  "Liquidation Larry",
  "Wick Wendy",
  "Spread Sam",
  "Hodl Hannah",
  "Leverage Leo",
  "Stop Loss Stella",
];

// ── Draft ───────────────────────────────────────────────────────────────────

export const totalPicks = (size: number) => size * ROSTER_SIZE;

/** Snake order: round 0 goes seat 0..n-1, round 1 goes n-1..0, and so on. */
export function seatForPick(pickNo: number, size: number): number {
  const round = Math.floor(pickNo / size);
  const i = pickNo % size;
  return round % 2 === 0 ? i : size - 1 - i;
}

// Small deterministic PRNG so a bot's pick is reproducible from (league, pick number).
function seeded(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/** Bots draft like a sensible human: last week's points and activity matter, with some noise. */
export function botChoice(available: PoolTrader[], seed: string): PoolTrader | null {
  if (available.length === 0) return null;
  const rand = seeded(seed);
  const scored = available
    .map((t) => ({ t, score: t.prevWeek.points + t.prevWeek.activeDays * 2 + rand() * 12 }))
    .sort((a, b) => b.score - a.score);
  return scored[Math.floor(rand() * Math.min(3, scored.length))]?.t ?? null;
}

// ── Lineups ─────────────────────────────────────────────────────────────────

export type LineupShape = { captainId: string; starters: string[]; bench: string[] };

/** Best three by last week's points start, the best of them captains. */
export function defaultLineup(roster: string[], prevPoints: Map<string, number>): LineupShape {
  const ranked = [...roster].sort((a, b) => (prevPoints.get(b) ?? 0) - (prevPoints.get(a) ?? 0) || a.localeCompare(b));
  const starters = ranked.slice(0, STARTERS);
  return { captainId: starters[0] ?? "", starters, bench: ranked.slice(STARTERS) };
}

export function lineupError(lineup: LineupShape, roster: string[]): string | null {
  const all = [...lineup.starters, ...lineup.bench];
  if (lineup.starters.length !== STARTERS || lineup.bench.length !== BENCH) return `pick ${STARTERS} starters and ${BENCH} on the bench`;
  if (new Set(all).size !== all.length) return "a trader can only be in one slot";
  if (all.length !== roster.length || !all.every((id) => roster.includes(id))) return "the lineup must use exactly your drafted traders";
  if (!lineup.starters.includes(lineup.captainId)) return "the captain must be one of your starters";
  return null;
}

// ── Status ──────────────────────────────────────────────────────────────────

export type LeagueTimes = {
  weekId: string;
  draftStartedAt: Date | null;
  draftCompletedAt: Date | null;
  playedAt: Date | null;
};

export function leagueStatus(l: LeagueTimes, now: Date): LeagueStatus {
  if (!l.draftStartedAt) return "setup";
  if (!l.draftCompletedAt) return "drafting";
  const { start, end } = weekBounds(l.weekId);
  const weekOver = end.getTime() <= now.getTime();
  // A league drafted before or during the week follows the calendar. One drafted after the week
  // ended is a replay and waits for the owner to play it.
  const replay = l.draftCompletedAt.getTime() >= end.getTime();
  if (replay) return l.playedAt ? "final" : "ready";
  if (weekOver) return "final";
  return start.getTime() <= now.getTime() ? "live" : "ready";
}

/** Days whose results may be shown: none before the week, today's index + 1 while live, all 7 after. */
export function daysRevealed(status: LeagueStatus, weekId: string, now: Date): number {
  if (status === "final") return 7;
  if (status !== "live") return 0;
  return Math.min(7, Math.floor((now.getTime() - weekBounds(weekId).start.getTime()) / DAY_MS) + 1);
}

export const lineupLocked = (status: LeagueStatus) => status === "live" || status === "final";

// ── Scoring ─────────────────────────────────────────────────────────────────

export type TraderDay = { points: number; liquidations: number; firstLiquidationAt: Date | null };
/** accountId -> day -> result. A missing day means the trader did not trade. */
export type PointsBook = Map<string, Map<number, TraderDay>>;

export type DayResult = {
  points: number;
  counted: string[];
  subs: { out: string; in: string }[];
  liquidated: { accountId: string; at: number }[];
};

/** One manager's score for one day: starters count, captain x1.5, idle starters auto-subbed in bench order. */
export function scoreLineupDay(lineup: LineupShape, book: PointsBook, day: number): DayResult {
  const played = (id: string) => book.get(id)?.get(day);
  const benchLeft = [...lineup.bench];
  const result: DayResult = { points: 0, counted: [], subs: [], liquidated: [] };

  for (const starter of lineup.starters) {
    let id = starter;
    if (!played(starter)) {
      const subIndex = benchLeft.findIndex((b) => played(b));
      if (subIndex >= 0) {
        id = benchLeft.splice(subIndex, 1)[0] as string;
        result.subs.push({ out: starter, in: id });
      }
    }
    const d = played(id);
    if (!d) continue;
    // The captain's multiplier stays with the captain slot only when the captain played.
    const multiplier = id === lineup.captainId ? CAPTAIN_MULTIPLIER : 1;
    result.points += d.points * multiplier;
    result.counted.push(id);
    if (d.liquidations > 0) result.liquidated.push({ accountId: id, at: d.firstLiquidationAt?.getTime() ?? 0 });
  }
  result.points = Math.round(result.points * 10) / 10;
  return result;
}

/** Fixed pairings for the week: seat 0 v 7, 1 v 6, 2 v 5, 3 v 4. */
export function pairings(seats: number[]): [number, number][] {
  const sorted = [...seats].sort((a, b) => a - b);
  const pairs: [number, number][] = [];
  for (let i = 0; i < Math.floor(sorted.length / 2); i++) {
    pairs.push([sorted[i] as number, sorted[sorted.length - 1 - i] as number]);
  }
  return pairs;
}

export type ScoredMember = { memberId: string; seat: number; lineup: LineupShape | null };

export function scoreLeague(members: ScoredMember[], book: PointsBook, days: number) {
  const daily = new Map<string, DayResult[]>();
  for (const m of members) {
    const results: DayResult[] = [];
    for (let day = 0; day < days; day++) {
      results.push(m.lineup ? scoreLineupDay(m.lineup, book, day) : { points: 0, counted: [], subs: [], liquidated: [] });
    }
    daily.set(m.memberId, results);
  }

  const bySeat = new Map(members.map((m) => [m.seat, m]));
  const matchups: Matchup[] = pairings(members.map((m) => m.seat)).map(([sa, sb]) => {
    const a = bySeat.get(sa) as ScoredMember;
    const b = bySeat.get(sb) as ScoredMember;
    const da = daily.get(a.memberId) ?? [];
    const db = daily.get(b.memberId) ?? [];
    const id = `${a.memberId}:${b.memberId}`;
    const events: ReplayEvent[] = [];
    let totalA = 0;
    let totalB = 0;
    let leader: string | null = null;
    const rows: [number, number][] = [];
    for (let day = 0; day < days; day++) {
      const ra = da[day] as DayResult;
      const rb = db[day] as DayResult;
      rows.push([ra.points, rb.points]);
      for (const [memberId, r] of [
        [a.memberId, ra],
        [b.memberId, rb],
      ] as const) {
        for (const s of r.subs) events.push({ kind: "autosub", day, memberId, out: s.out, in: s.in });
        for (const l of r.liquidated) events.push({ kind: "liquidation", day, accountId: l.accountId, at: l.at });
      }
      totalA += ra.points;
      totalB += rb.points;
      const ahead: string | null = totalA > totalB ? a.memberId : totalB > totalA ? b.memberId : leader;
      if (ahead && ahead !== leader && leader !== null) events.push({ kind: "leadChange", day, matchupId: id, leaderId: ahead });
      leader = ahead;
    }
    return { id, a: a.memberId, b: b.memberId, daily: rows, events };
  });

  const standings = members
    .map((m) => ({
      memberId: m.memberId,
      points: Math.round((daily.get(m.memberId) ?? []).reduce((s, r) => s + r.points, 0) * 10) / 10,
    }))
    .sort((x, y) => y.points - x.points);

  return { matchups, standings };
}
