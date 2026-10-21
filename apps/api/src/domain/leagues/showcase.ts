// The public showcase: eight bots draft a league from a finished week's real pool, the league is
// scored on that week's real trades, and the most dramatic matchup is featured on the landing page.
// Nothing is stored; finished weeks never change, so the result is cached per week.
import { and, eq, gte, inArray, lt, sql } from "drizzle-orm";
import type { DayPoints, LeagueState, PoolTrader, Showcase, ShowcaseStats } from "@draftweek/shared";
import type { Db } from "../../db/client.js";
import { fills, traderDays, traders } from "../../db/schema.js";
import { lastSuccessfulIngest } from "../ingest/run.js";
import { addWeeks, weekBounds, weekIdOf } from "../scoring/weeks.js";
import { draftPool } from "../traders/pool.js";
import { BOT_NAMES, LEAGUE_SIZE, botChoice, defaultLineup, scoreLeague, seatForPick, totalPicks, type PointsBook } from "./rules.js";

const STATS_TTL_MS = 60_000;

/**
 * The landing page's hand: varied on purpose, so it shows what cards can be. The best card overall
 * in the middle, the best of each other style around it, then the strongest cards left. Up to 12.
 */
export function dealHand(pool: PoolTrader[]): PoolTrader[] {
  const ranked = [...pool].sort((a, b) => b.rating - a.rating || b.prevWeek.points - a.prevWeek.points);
  const hand: PoolTrader[] = [];
  const take = (t: PoolTrader | undefined) => t && !hand.includes(t) && hand.push(t);
  take(ranked[0]);
  for (const style of ["degen", "scalper", "swing", "steady"] as const) take(ranked.find((t) => t.style === style && !hand.includes(t)));
  take(ranked.find((t) => t.tier === "gold" && !hand.includes(t)));
  for (const t of ranked) if (hand.length < 12) take(t);
  // fan order: the best card in the centre of the first five
  const first = hand.slice(0, 5);
  const centre = first.shift();
  if (centre) first.splice(Math.floor(first.length / 2), 0, centre);
  return [...first, ...hand.slice(5)];
}

export function createShowcase(db: Db, opts: { now?: () => Date } = {}) {
  const now = opts.now ?? (() => new Date());
  const games = new Map<string, { league: LeagueState; featuredMatchupId: string }>();
  let stats: { at: number; value: ShowcaseStats } | null = null;

  async function buildGame(weekId: string) {
    const pool = await draftPool(db, weekId);
    if (pool.length < totalPicks(LEAGUE_SIZE)) return null;

    const members = BOT_NAMES.slice(0, LEAGUE_SIZE).map((name, seat) => ({ id: `bot-${seat}`, name, isBot: true, seat }));
    const taken = new Set<string>();
    const picks: LeagueState["picks"] = [];
    for (let pickNo = 0; pickNo < totalPicks(LEAGUE_SIZE); pickNo++) {
      const member = members[seatForPick(pickNo, LEAGUE_SIZE)] as (typeof members)[number];
      const choice = botChoice(pool.filter((t) => !taken.has(t.accountId)), `showcase:${weekId}:${pickNo}`);
      if (!choice) return null;
      taken.add(choice.accountId);
      picks.push({ pickNo, memberId: member.id, accountId: choice.accountId });
    }

    const prevPoints = new Map(pool.map((t) => [t.accountId, t.prevWeek.points]));
    const lineups = members.map((m) => ({
      memberId: m.id,
      ...defaultLineup(picks.filter((p) => p.memberId === m.id).map((p) => p.accountId), prevPoints),
    }));

    const accountIds = picks.map((p) => p.accountId);
    const rows = await db
      .select()
      .from(traderDays)
      .where(and(eq(traderDays.weekId, weekId), inArray(traderDays.accountId, accountIds)));
    const book: PointsBook = new Map();
    const points: DayPoints[] = [];
    for (const r of rows) {
      const days = book.get(r.accountId) ?? new Map();
      days.set(r.day, { points: r.points, liquidations: r.liquidations, firstLiquidationAt: r.firstLiquidationAt });
      book.set(r.accountId, days);
      points.push({ accountId: r.accountId, day: r.day, points: r.points, liquidated: r.liquidations > 0 });
    }
    const lineupBy = new Map(lineups.map((l) => [l.memberId, l]));
    const { matchups, standings } = scoreLeague(
      members.map((m) => ({ memberId: m.id, seat: m.seat, lineup: lineupBy.get(m.id) ?? null })),
      book,
      7,
    );

    // Game of the week: most lead changes, then a liquidation on screen, then the closest finish.
    const drama = (m: (typeof matchups)[number]) => {
      const [a, b] = m.daily.reduce(([x, y], [p, q]) => [x + p, y + q], [0, 0]);
      return {
        leadChanges: m.events.filter((e) => e.kind === "leadChange").length,
        liquidation: m.events.some((e) => e.kind === "liquidation") ? 1 : 0,
        margin: Math.abs(a - b) / Math.max(1, a + b),
      };
    };
    const featured = [...matchups].sort((x, y) => {
      const dx = drama(x);
      const dy = drama(y);
      return dy.leadChanges - dx.leadChanges || dy.liquidation - dx.liquidation || dx.margin - dy.margin;
    })[0];
    if (!featured) return null;

    const names = await db
      .select({ accountId: traders.accountId, name: traders.name })
      .from(traders)
      .where(inArray(traders.accountId, accountIds));

    const league: LeagueState = {
      id: `showcase-${weekId}`,
      name: "Game of the week",
      weekId,
      status: "final",
      inviteCode: "",
      size: LEAGUE_SIZE,
      ownerMemberId: "bot-0",
      myMemberId: null,
      daysRevealed: 7,
      members,
      picks,
      onTheClock: null,
      lineups,
      matchups,
      standings,
      points,
      traders: names,
    };
    return { league, featuredMatchupId: featured.id };
  }

  async function currentStats(lastWeek: string): Promise<ShowcaseStats> {
    if (stats && now().getTime() - stats.at < STATS_TTL_MS) return stats.value;
    const { start, end } = weekBounds(lastWeek);
    const [followed] = await db.select({ n: sql<number>`count(*)::int` }).from(traders).where(eq(traders.optedOut, false));
    const [week] = await db
      .select({
        trades: sql<number>`count(*)::int`,
        liquidations: sql<number>`(count(distinct ${fills.orderId}) filter (where ${fills.autoCloseType} in ('liquidation', 'adl', 'bankrupt')))::int`,
      })
      .from(fills)
      .where(and(gte(fills.ts, start), lt(fills.ts, end)));
    const value: ShowcaseStats = {
      tradersFollowed: followed?.n ?? 0,
      tradesLastWeek: week?.trades ?? 0,
      liquidationsLastWeek: week?.liquidations ?? 0,
      draftableThisWeek: (await draftPool(db, weekIdOf(now()))).length,
      lastIngestAt: await lastSuccessfulIngest(db),
    };
    stats = { at: now().getTime(), value };
    return value;
  }

  return {
    async get(): Promise<Showcase | null> {
      const lastWeek = addWeeks(weekIdOf(now()), -1);
      let game = games.get(lastWeek);
      if (!game) {
        const built = await buildGame(lastWeek);
        if (!built) return null;
        game = built;
        // Cache only once an ingest has run well after the week closed, so late Sunday trades are in.
        const ingested = await lastSuccessfulIngest(db);
        if (ingested !== null && ingested > weekBounds(lastWeek).end.getTime() + 10 * 60_000) games.set(lastWeek, game);
      }
      const stars = dealHand(await draftPool(db, weekIdOf(now())));
      return { ...game, stats: await currentStats(lastWeek), stars };
    },
  };
}

export type ShowcaseService = ReturnType<typeof createShowcase>;
