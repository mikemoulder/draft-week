import { randomInt } from "node:crypto";
import { and, asc, eq, inArray, lt } from "drizzle-orm";
import {
  BASE_BUDGET,
  volumeBonus,
  type DayPoints,
  type HistoryEntry,
  type LeagueState,
  type LeagueSummary,
  type PoolTrader,
  type Profile,
  type SquadRequest,
  type TraderStyle,
} from "@draftweek/shared";
import type { Db } from "../../db/client.js";
import { leagueMembers, leagues, squads, traderDays, traders, users } from "../../db/schema.js";
import type { StrikeClient } from "../../strike.js";
import { fail, ok, type Result } from "../result.js";
import { draftPool, playableWeeks } from "../traders/pool.js";
import {
  botNames,
  LEAGUE_SIZE,
  autoSquad,
  daysRevealed,
  isReplay,
  leagueStatus,
  scoreLeague,
  squadCost,
  squadError,
  squadsLocked,
  type PointsBook,
} from "./rules.js";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type League = typeof leagues.$inferSelect;
type MemberRow = typeof leagueMembers.$inferSelect;

const INVITE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O or 1/I/L
const UNIQUE_VIOLATION = "23505";

const inviteCode = () => Array.from({ length: 8 }, () => INVITE_ALPHABET[randomInt(INVITE_ALPHABET.length)]).join("");

export type LeagueService = ReturnType<typeof createLeagueService>;
export type Viewer = { userId: string; displayName: string };

export function createLeagueService(db: Db, opts: { now?: () => Date; strike?: Pick<StrikeClient, "leaderboardFor"> } = {}) {
  const now = opts.now ?? (() => new Date());

  async function loadLeague(q: Db | Tx, id: string, forUpdate = false): Promise<League | null> {
    const base = q.select().from(leagues).where(eq(leagues.id, id));
    const [row] = forUpdate ? await base.for("update") : await base;
    return row ?? null;
  }

  async function membersOf(q: Db | Tx, leagueId: string): Promise<MemberRow[]> {
    return q.select().from(leagueMembers).where(eq(leagueMembers.leagueId, leagueId)).orderBy(asc(leagueMembers.seat));
  }

  /** Extra credits from the user's own Strike volume over the last 7 days. 0 for guests or on any error. */
  async function bonusFor(userId: string): Promise<number> {
    if (!opts.strike) return 0;
    const [user] = await db.select({ accountId: users.strikeAccountId }).from(users).where(eq(users.id, userId));
    if (!user?.accountId) return 0;
    try {
      const [row] = await opts.strike.leaderboardFor([user.accountId], "7d");
      return volumeBonus(row?.volume ?? 0);
    } catch {
      return 0;
    }
  }

  /**
   * At kick-off: bots take the empty seats, and every manager without a squad gets one picked for them,
   * within their own budget. Idempotent: seats and squads already there are kept.
   */
  async function fillForKickoff(tx: Tx, league: League, pool: PoolTrader[]) {
    const members = await membersOf(tx, league.id);
    const usedNames = new Set(members.map((m) => m.displayName));
    const names = botNames(league.id).filter((n) => !usedNames.has(n));
    for (let seat = 0; seat < league.size; seat++) {
      if (members.some((m) => m.seat === seat)) continue;
      const [bot] = await tx
        .insert(leagueMembers)
        .values({ leagueId: league.id, userId: null, displayName: names.shift() ?? `Bot ${seat + 1}`, seat })
        .returning();
      if (bot) members.push(bot);
    }
    const have = new Set(
      (await tx.select({ m: squads.memberId }).from(squads).where(inArray(squads.memberId, members.map((m) => m.id)))).map((r) => r.m),
    );
    const prices = new Map(pool.map((t) => [t.accountId, t.price]));
    for (const m of members) {
      if (have.has(m.id)) continue;
      const squad = autoSquad(pool, BASE_BUDGET + m.budgetBonus, `${league.id}:${m.id}`);
      if (squad) await tx.insert(squads).values({ memberId: m.id, ...squad, spent: squadCost(squad, prices) }).onConflictDoNothing();
    }
  }

  async function state(leagueId: string, viewer: Viewer): Promise<Result<LeagueState>> {
    let league = await loadLeague(db, leagueId);
    if (!league) return fail(404, "league not found");
    let members = await membersOf(db, leagueId);
    const me = members.find((m) => m.userId === viewer.userId) ?? null;
    if (!me) return fail(403, "you are not in this league");

    const at = now();
    const status = leagueStatus(league, at);
    // A calendar league that has kicked off fills its seats and squads on first read.
    if (status !== "picking" && members.length < league.size) {
      const pool = await draftPool(db, league.weekId);
      await db.transaction(async (tx) => {
        const locked = (await loadLeague(tx, leagueId, true)) as League;
        await fillForKickoff(tx, locked, pool);
      });
      league = (await loadLeague(db, leagueId)) as League;
      members = await membersOf(db, leagueId);
    }

    const revealed = daysRevealed(status, league.weekId, at);
    const squadRows = members.length ? await db.select().from(squads).where(inArray(squads.memberId, members.map((m) => m.id))) : [];
    const visible = squadsLocked(status) ? squadRows : squadRows.filter((s) => s.memberId === me.id);
    const accountIds = [...new Set(visible.flatMap((s) => [...s.starters, ...s.bench]))];
    const traderRows = accountIds.length
      ? await db
          .select({ accountId: traders.accountId, name: traders.name, avatarUrl: traders.avatarUrl })
          .from(traders)
          .where(inArray(traders.accountId, accountIds))
      : [];
    // Styles live on the pool (computed from last week); fall back to steady for anyone missing.
    const styleOf = accountIds.length ? new Map((await draftPool(db, league.weekId)).map((t) => [t.accountId, t.style])) : new Map();

    const owner = members.find((m) => m.userId === league.ownerId) as MemberRow;
    const base = {
      id: league.id,
      name: league.name,
      weekId: league.weekId,
      status,
      replay: isReplay(league),
      inviteCode: league.inviteCode,
      size: league.size,
      ownerMemberId: owner.id,
      myMemberId: me.id,
      daysRevealed: revealed,
      members: members.map((m) => ({
        id: m.id,
        name: m.displayName,
        isBot: m.userId === null,
        seat: m.seat,
        hasSquad: squadRows.some((s) => s.memberId === m.id),
        budget: BASE_BUDGET + m.budgetBonus,
        bonus: m.budgetBonus,
      })),
      squads: visible.map((s) => ({ memberId: s.memberId, captainId: s.captainId, starters: s.starters, bench: s.bench, spent: s.spent })),
      traders: traderRows.map((t) => ({ ...t, style: styleOf.get(t.accountId) ?? "steady" })),
    };

    if (revealed === 0 || accountIds.length === 0) return ok({ ...base, matchups: [], standings: [], points: [] });

    const rows = await db
      .select()
      .from(traderDays)
      .where(and(eq(traderDays.weekId, league.weekId), inArray(traderDays.accountId, accountIds), lt(traderDays.day, revealed)));
    const book: PointsBook = new Map();
    const points: DayPoints[] = [];
    for (const r of rows) {
      const days = book.get(r.accountId) ?? new Map();
      days.set(r.day, { points: r.points, liquidations: r.liquidations, firstLiquidationAt: r.firstLiquidationAt });
      book.set(r.accountId, days);
      points.push({ accountId: r.accountId, day: r.day, points: r.points, liquidated: r.liquidations > 0 });
    }
    const squadBy = new Map(squadRows.map((s) => [s.memberId, s]));
    const scored = scoreLeague(
      members.map((m) => ({ memberId: m.id, seat: m.seat, isBot: m.userId === null, lineup: squadBy.get(m.id) ?? null })),
      book,
      revealed,
    );
    return ok({ ...base, ...scored, points });
  }

  return {
    state,

    async create(viewer: Viewer, input: { name: string; weekId: string; size?: number }): Promise<Result<LeagueState>> {
      const weeks = await playableWeeks(db, now());
      if (!weeks.some((w) => w.id === input.weekId)) return fail(400, "that week cannot host a league");
      const bonus = await bonusFor(viewer.userId);
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const id = await db.transaction(async (tx) => {
            const [league] = await tx
              .insert(leagues)
              .values({ weekId: input.weekId, name: input.name, ownerId: viewer.userId, inviteCode: inviteCode(), size: input.size ?? LEAGUE_SIZE, createdAt: now() })
              .returning({ id: leagues.id });
            const leagueId = (league as { id: string }).id;
            await tx.insert(leagueMembers).values({ leagueId, userId: viewer.userId, displayName: viewer.displayName, seat: 0, budgetBonus: bonus });
            return leagueId;
          });
          return state(id, viewer);
        } catch (err) {
          if ((err as { code?: string }).code !== UNIQUE_VIOLATION) throw err;
        }
      }
      return fail(500, "could not create the league, please try again");
    },

    async join(viewer: Viewer, code: string): Promise<Result<LeagueState>> {
      const [league] = await db.select().from(leagues).where(eq(leagues.inviteCode, code.trim().toUpperCase()));
      if (!league) return fail(404, "no league with that invite code");
      const bonus = await bonusFor(viewer.userId);
      const result = await db.transaction(async (tx) => {
        await loadLeague(tx, league.id, true);
        const members = await membersOf(tx, league.id);
        if (members.some((m) => m.userId === viewer.userId)) return ok(league.id);
        if (leagueStatus(league, now()) !== "picking") return fail<string>(409, "this league has already kicked off");
        const free = Array.from({ length: league.size }, (_, i) => i).find((s) => !members.some((m) => m.seat === s));
        if (free === undefined) return fail<string>(409, "the league is full");
        await tx.insert(leagueMembers).values({ leagueId: league.id, userId: viewer.userId, displayName: viewer.displayName, seat: free, budgetBonus: bonus });
        return ok(league.id);
      });
      return result.ok ? state(result.value, viewer) : result;
    },

    async setSquad(viewer: Viewer, leagueId: string, input: SquadRequest): Promise<Result<LeagueState>> {
      const league = await loadLeague(db, leagueId);
      if (!league) return fail(404, "league not found");
      if (squadsLocked(leagueStatus(league, now()))) return fail(409, "squads are locked for this week");
      const members = await membersOf(db, leagueId);
      const me = members.find((m) => m.userId === viewer.userId);
      if (!me) return fail(403, "you are not in this league");
      const prices = new Map((await draftPool(db, league.weekId)).map((t) => [t.accountId, t.price]));
      // Fair play: a manager cannot score their own trading.
      const [self] = await db.select({ accountId: users.strikeAccountId }).from(users).where(eq(users.id, viewer.userId));
      if (self?.accountId && [...input.starters, ...input.bench].includes(self.accountId)) return fail(400, "you cannot pick your own Strike account");
      const problem = squadError(input, prices, BASE_BUDGET + me.budgetBonus);
      if (problem) return fail(400, problem);
      const row = { ...input, spent: squadCost(input, prices), updatedAt: now() };
      await db.insert(squads).values({ memberId: me.id, ...row }).onConflictDoUpdate({ target: squads.memberId, set: row });
      return state(leagueId, viewer);
    },

    async play(viewer: Viewer, leagueId: string): Promise<Result<LeagueState>> {
      const league = await loadLeague(db, leagueId);
      if (!league) return fail(404, "league not found");
      if (league.ownerId !== viewer.userId) return fail(403, "only the league owner can play the week");
      if (!isReplay(league) || leagueStatus(league, now()) !== "picking") return fail(409, "only a replay league can be played");
      const members = await membersOf(db, leagueId);
      const mine = members.find((m) => m.userId === viewer.userId);
      const [hasSquad] = mine ? await db.select({ m: squads.memberId }).from(squads).where(eq(squads.memberId, mine.id)) : [];
      if (!hasSquad) return fail(409, "pick your squad before you play the week");
      const pool = await draftPool(db, league.weekId);
      await db.transaction(async (tx) => {
        const locked = (await loadLeague(tx, leagueId, true)) as League;
        if (locked.playedAt) return;
        await fillForKickoff(tx, locked, pool);
        await tx.update(leagues).set({ playedAt: now() }).where(eq(leagues.id, leagueId));
      });
      return state(leagueId, viewer);
    },

    async mine(viewer: Viewer): Promise<LeagueSummary[]> {
      const rows = await db.select({ leagueId: leagueMembers.leagueId }).from(leagueMembers).where(eq(leagueMembers.userId, viewer.userId));
      const out: LeagueSummary[] = [];
      for (const { leagueId } of rows) {
        const s = await state(leagueId, viewer);
        if (!s.ok) continue;
        const v = s.value;
        const rank = v.standings.findIndex((x) => x.memberId === v.myMemberId);
        out.push({
          id: v.id,
          name: v.name,
          weekId: v.weekId,
          status: v.status,
          members: v.members.length,
          myPoints: rank >= 0 ? (v.standings[rank]?.points ?? null) : null,
          myRank: rank >= 0 ? rank + 1 : null,
        });
      }
      return out.sort((a, b) => b.weekId.localeCompare(a.weekId));
    },

    /** Every league the viewer is in, with how it went, plus career totals for the profile page. */
    async profile(viewer: Viewer): Promise<Profile> {
      const rows = await db.select({ leagueId: leagueMembers.leagueId }).from(leagueMembers).where(eq(leagueMembers.userId, viewer.userId));
      const leaguesOut: HistoryEntry[] = [];
      const picks = new Map<string, { accountId: string; name: string; style: TraderStyle; avatarUrl: string | null; picks: number }>();
      for (const { leagueId } of rows) {
        const s = await state(leagueId, viewer);
        if (!s.ok) continue;
        const v = s.value;
        const at = v.standings.findIndex((x) => x.memberId === v.myMemberId);
        const mine = at >= 0 ? v.standings[at] : undefined;
        const matchup = v.matchups.find((m) => m.a === v.myMemberId || m.b === v.myMemberId);
        const opponentId = matchup ? (matchup.a === v.myMemberId ? matchup.b : matchup.a) : null;
        const squad = v.squads.find((q) => q.memberId === v.myMemberId);
        const trader = (id: string) => v.traders.find((t) => t.accountId === id);
        for (const id of squad ? [...squad.starters, ...squad.bench] : []) {
          const t = trader(id);
          if (!t) continue;
          const seen = picks.get(id) ?? { accountId: id, name: t.name, style: t.style, avatarUrl: t.avatarUrl, picks: 0 };
          seen.picks++;
          picks.set(id, seen);
        }
        leaguesOut.push({
          id: v.id,
          name: v.name,
          weekId: v.weekId,
          status: v.status,
          replay: v.replay,
          members: v.members.length,
          myPoints: mine?.points ?? null,
          myRank: at >= 0 ? at + 1 : null,
          result: mine?.result ?? null,
          opponent: opponentId ? (v.members.find((m) => m.id === opponentId)?.name ?? null) : null,
          captain: squad ? { accountId: squad.captainId, name: trader(squad.captainId)?.name ?? squad.captainId.slice(0, 8) } : null,
        });
      }
      leaguesOut.sort((a, b) => b.weekId.localeCompare(a.weekId) || a.name.localeCompare(b.name));
      const finished = leaguesOut.filter((l) => l.status === "final");
      const count = (r: "W" | "L" | "D") => finished.filter((l) => l.result === r).length;
      const ranks = finished.map((l) => l.myRank).filter((r): r is number => r !== null);
      return {
        totals: {
          leagues: leaguesOut.length,
          finished: finished.length,
          wins: count("W"),
          losses: count("L"),
          draws: count("D"),
          points: Math.round(leaguesOut.reduce((sum, l) => sum + (l.myPoints ?? 0), 0) * 10) / 10,
          bestRank: ranks.length ? Math.min(...ranks) : null,
        },
        favorites: [...picks.values()].sort((a, b) => b.picks - a.picks || a.name.localeCompare(b.name)).slice(0, 3),
        leagues: leaguesOut,
      };
    },
  };
}
