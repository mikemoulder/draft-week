// Pure league rules. No database access here, so every rule is unit tested directly.
import { MIN_LEAGUE_SIZE, pairings, type LeagueStatus, type Matchup, type PoolTrader, type ReplayEvent } from "@draftweek/shared";

export { pairings };
import { DAY_MS, weekBounds } from "../scoring/weeks.js";

export const ROSTER_SIZE = 5;
export const STARTERS = 3;
export const BENCH = ROSTER_SIZE - STARTERS;
export const CAPTAIN_MULTIPLIER = 1.5;
export const LEAGUE_SIZE = MIN_LEAGUE_SIZE;

// Bots get ordinary first names; the robot icon beside them already says they are bots.
export const BOT_NAMES = [
  "Alex", "Paul", "Steven", "Maya", "Daniel", "Sofia", "Marcus", "Chloe",
  "Ryan", "Amara", "Leo", "Nina", "Tom", "Priya", "Ben", "Zoe",
  "Kofi", "Hannah", "Luca", "Ivy", "Sam", "Elena", "Omar", "Jade",
];

// ── Squads ──────────────────────────────────────────────────────────────────

export type LineupShape = { captainId: string; starters: string[]; bench: string[] };

// Small deterministic PRNG so a bot's squad is reproducible from its seed.
function seeded(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/** Best three by last week's points start, the best of them captains. */
export function defaultLineup(roster: string[], prevPoints: Map<string, number>): LineupShape {
  const ranked = [...roster].sort((a, b) => (prevPoints.get(b) ?? 0) - (prevPoints.get(a) ?? 0) || a.localeCompare(b));
  const starters = ranked.slice(0, STARTERS);
  return { captainId: starters[0] ?? "", starters, bench: ranked.slice(STARTERS) };
}

/**
 * A sensible squad within budget, for bots and for managers who never picked. Traders are scored
 * on last week's points and activity with some noise, then taken best-first as long as the budget
 * left still covers the cheapest remaining traders for every open slot.
 */
/** A league's own mix of bot names, the same every time for the same seed. */
export function botNames(seed: string): string[] {
  const rand = seeded(`names:${seed}`);
  const names = [...BOT_NAMES];
  for (let i = names.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [names[i], names[j]] = [names[j] as string, names[i] as string];
  }
  return names;
}

export function autoSquad(pool: PoolTrader[], budget: number, seed: string): LineupShape | null {
  if (pool.length < ROSTER_SIZE) return null;
  const rand = seeded(seed);
  const byPrice = [...pool].sort((a, b) => a.price - b.price);
  const ranked = pool
    .map((t) => ({ t, score: t.prevWeek.points + t.prevWeek.activeDays * 2 + rand() * 14 }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.t);
  const picked = new Set<PoolTrader>();
  let left = budget;
  // what the cheapest `slots` traders still available (other than `skip`) would cost
  const reserve = (slots: number, skip: PoolTrader) => {
    let sum = 0;
    let n = 0;
    for (const t of byPrice) {
      if (n === slots) break;
      if (t === skip || picked.has(t)) continue;
      sum += t.price;
      n++;
    }
    return n === slots ? sum : Infinity;
  };
  for (const t of ranked) {
    if (picked.size === ROSTER_SIZE) break;
    if (t.price + reserve(ROSTER_SIZE - picked.size - 1, t) <= left) {
      picked.add(t);
      left -= t.price;
    }
  }
  if (picked.size < ROSTER_SIZE) return null;
  const chosen = [...picked];
  return defaultLineup(
    chosen.map((t) => t.accountId),
    new Map(chosen.map((t) => [t.accountId, t.prevWeek.points])),
  );
}

/** Why a squad is not allowed, or null. Prices come from the league week's pool. */
export function squadError(squad: LineupShape, prices: Map<string, number>, budget: number): string | null {
  const all = [...squad.starters, ...squad.bench];
  if (squad.starters.length !== STARTERS || squad.bench.length !== BENCH) return `pick ${STARTERS} starters and ${BENCH} on the bench`;
  if (new Set(all).size !== all.length) return "a trader can only be in your squad once";
  if (!all.every((id) => prices.has(id))) return "every trader must come from this week's list";
  if (!squad.starters.includes(squad.captainId)) return "the captain must be one of your starters";
  const spent = squadCost(squad, prices);
  if (spent > budget) return `that squad costs ${spent} credits and your budget is ${budget}`;
  return null;
}

export const squadCost = (squad: LineupShape, prices: Map<string, number>) =>
  [...squad.starters, ...squad.bench].reduce((sum, id) => sum + (prices.get(id) ?? 0), 0);

// ── Status ──────────────────────────────────────────────────────────────────

export type LeagueTimes = { weekId: string; createdAt: Date; playedAt: Date | null };

/** A league created after its week ended is a replay: it is played on demand by its owner. */
export const isReplay = (l: Pick<LeagueTimes, "weekId" | "createdAt">) => l.createdAt.getTime() >= weekBounds(l.weekId).end.getTime();

export function leagueStatus(l: LeagueTimes, now: Date): LeagueStatus {
  if (isReplay(l)) return l.playedAt ? "final" : "picking";
  const { start, end } = weekBounds(l.weekId);
  if (end.getTime() <= now.getTime()) return "final";
  return start.getTime() <= now.getTime() ? "live" : "picking";
}

/** Days whose results may be shown: none before the week, today's index + 1 while live, all 7 after. */
export function daysRevealed(status: LeagueStatus, weekId: string, now: Date): number {
  if (status === "final") return 7;
  if (status !== "live") return 0;
  return Math.min(7, Math.floor((now.getTime() - weekBounds(weekId).start.getTime()) / DAY_MS) + 1);
}

export const squadsLocked = (status: LeagueStatus) => status !== "picking";

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

export type ScoredMember = { memberId: string; seat: number; isBot: boolean; lineup: LineupShape | null };

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
  const matchups: Matchup[] = pairings(members).map(([sa, sb]) => {
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

  // Each manager's head-to-head result so far, read next to the points table.
  const result = new Map<string, "W" | "L" | "D">();
  for (const m of matchups) {
    const [ta, tb] = m.daily.reduce(([x, y], [p, q]) => [x + p, y + q], [0, 0]);
    result.set(m.a, ta > tb ? "W" : ta < tb ? "L" : "D");
    result.set(m.b, tb > ta ? "W" : tb < ta ? "L" : "D");
  }
  const standings = members
    .map((m) => ({
      memberId: m.memberId,
      points: Math.round((daily.get(m.memberId) ?? []).reduce((s, r) => s + r.points, 0) * 10) / 10,
      result: days > 0 ? (result.get(m.memberId) ?? null) : null,
    }))
    .sort((x, y) => y.points - x.points);

  return { matchups, standings };
}
