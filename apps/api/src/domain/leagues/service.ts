import { randomInt } from "node:crypto";
import { and, asc, eq, inArray, lt } from "drizzle-orm";
import type { DayPoints, LeagueState, LeagueSummary, LineupRequest, PoolTrader } from "@draftweek/shared";
import type { Db } from "../../db/client.js";
import { leagueMembers, leagues, lineups, picks, traderDays, traders } from "../../db/schema.js";
import { fail, ok, type Result } from "../result.js";
import { weekBounds } from "../scoring/weeks.js";
import { draftPool, playableWeeks } from "../traders/pool.js";
import {
  BOT_NAMES,
  LEAGUE_SIZE,
  botChoice,
  daysRevealed,
  defaultLineup,
  leagueStatus,
  lineupError,
  lineupLocked,
  scoreLeague,
  seatForPick,
  totalPicks,
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

export function createLeagueService(db: Db, opts: { now?: () => Date } = {}) {
  const now = opts.now ?? (() => new Date());

  async function loadLeague(q: Db | Tx, id: string, forUpdate = false): Promise<League | null> {
    const base = q.select().from(leagues).where(eq(leagues.id, id));
    const [row] = forUpdate ? await base.for("update") : await base;
    return row ?? null;
  }

  async function membersOf(q: Db | Tx, leagueId: string): Promise<MemberRow[]> {
    return q.select().from(leagueMembers).where(eq(leagueMembers.leagueId, leagueId)).orderBy(asc(leagueMembers.seat));
  }

  /**
   * Fill every pick that belongs to a bot, starting at the current pick, until a human is on the
   * clock or the draft is complete. Completing the draft sets everyone's default lineup.
   */
  async function advanceDraft(tx: Tx, league: League, pool: PoolTrader[]) {
    const members = await membersOf(tx, league.id);
    const bySeat = new Map(members.map((m) => [m.seat, m]));
    const taken = new Set((await tx.select({ a: picks.accountId }).from(picks).where(eq(picks.leagueId, league.id))).map((r) => r.a));
    let pickNo = taken.size;
    const total = totalPicks(league.size);

    while (pickNo < total) {
      const member = bySeat.get(seatForPick(pickNo, league.size));
      if (!member || member.userId !== null) break;
      const choice = botChoice(pool.filter((t) => !taken.has(t.accountId)), `${league.id}:${pickNo}`);
      if (!choice) break;
      await tx.insert(picks).values({ leagueId: league.id, pickNo, memberId: member.id, accountId: choice.accountId });
      taken.add(choice.accountId);
      pickNo++;
    }

    if (pickNo >= total) {
      await tx.update(leagues).set({ draftCompletedAt: now() }).where(eq(leagues.id, league.id));
      const prevPoints = new Map(pool.map((t) => [t.accountId, t.prevWeek.points]));
      const all = await tx.select().from(picks).where(eq(picks.leagueId, league.id));
      for (const m of members) {
        const roster = all.filter((p) => p.memberId === m.id).map((p) => p.accountId);
        const lu = defaultLineup(roster, prevPoints);
        await tx.insert(lineups).values({ memberId: m.id, ...lu }).onConflictDoNothing();
      }
    }
  }

  async function state(leagueId: string, viewer: Viewer): Promise<Result<LeagueState>> {
    const league = await loadLeague(db, leagueId);
    if (!league) return fail(404, "league not found");
    const members = await membersOf(db, leagueId);
    const me = members.find((m) => m.userId === viewer.userId) ?? null;
    if (!me) return fail(403, "you are not in this league");

    const at = now();
    const status = leagueStatus(league, at);
    const revealed = daysRevealed(status, league.weekId, at);
    const pickRows = await db.select().from(picks).where(eq(picks.leagueId, leagueId)).orderBy(asc(picks.pickNo));
    const lineupRows = members.length
      ? await db.select().from(lineups).where(inArray(lineups.memberId, members.map((m) => m.id)))
      : [];
    const accountIds = pickRows.map((p) => p.accountId);
    const names = accountIds.length
      ? await db.select({ accountId: traders.accountId, name: traders.name }).from(traders).where(inArray(traders.accountId, accountIds))
      : [];

    const owner = members.find((m) => m.userId === league.ownerId) as MemberRow;
    const base = {
      id: league.id,
      name: league.name,
      weekId: league.weekId,
      status,
      inviteCode: league.inviteCode,
      size: league.size,
      ownerMemberId: owner.id,
      myMemberId: me.id,
      daysRevealed: revealed,
      members: members.map((m) => ({ id: m.id, name: m.displayName, isBot: m.userId === null, seat: m.seat })),
      picks: pickRows.map((p) => ({ pickNo: p.pickNo, memberId: p.memberId, accountId: p.accountId })),
      onTheClock:
        status === "drafting" ? (members.find((m) => m.seat === seatForPick(pickRows.length, league.size))?.id ?? null) : null,
      lineups: lineupRows.map((l) => ({ memberId: l.memberId, captainId: l.captainId, starters: l.starters, bench: l.bench })),
      traders: names,
    };

    if (revealed === 0 || accountIds.length === 0) {
      return ok({ ...base, matchups: [], standings: [], points: [] });
    }

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
    const lineupBy = new Map(lineupRows.map((l) => [l.memberId, l]));
    const scored = scoreLeague(
      members.map((m) => ({ memberId: m.id, seat: m.seat, lineup: lineupBy.get(m.id) ?? null })),
      book,
      revealed,
    );
    return ok({ ...base, ...scored, points });
  }

  return {
    state,

    async create(viewer: Viewer, input: { name: string; weekId: string }): Promise<Result<LeagueState>> {
      const weeks = await playableWeeks(db, now());
      if (!weeks.some((w) => w.id === input.weekId)) return fail(400, "that week cannot host a league");
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const id = await db.transaction(async (tx) => {
            const [league] = await tx
              .insert(leagues)
              .values({ weekId: input.weekId, name: input.name, ownerId: viewer.userId, inviteCode: inviteCode(), size: LEAGUE_SIZE })
              .returning({ id: leagues.id });
            const leagueId = (league as { id: string }).id;
            await tx.insert(leagueMembers).values({ leagueId, userId: viewer.userId, displayName: viewer.displayName, seat: 0 });
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
      const result = await db.transaction(async (tx) => {
        await loadLeague(tx, league.id, true);
        const members = await membersOf(tx, league.id);
        if (members.some((m) => m.userId === viewer.userId)) return ok(league.id);
        if (leagueStatus(league, now()) !== "setup") return fail<string>(409, "the draft has already started");
        const free = Array.from({ length: league.size }, (_, i) => i).find((s) => !members.some((m) => m.seat === s));
        if (free === undefined) return fail<string>(409, "the league is full");
        await tx.insert(leagueMembers).values({ leagueId: league.id, userId: viewer.userId, displayName: viewer.displayName, seat: free });
        return ok(league.id);
      });
      return result.ok ? state(result.value, viewer) : result;
    },

    async startDraft(viewer: Viewer, leagueId: string): Promise<Result<LeagueState>> {
      const league = await loadLeague(db, leagueId);
      if (!league) return fail(404, "league not found");
      if (league.ownerId !== viewer.userId) return fail(403, "only the league owner can start the draft");
      const pool = await draftPool(db, league.weekId);
      if (pool.length < totalPicks(league.size)) return fail(409, "not enough active traders that week to fill a draft");

      const result = await db.transaction(async (tx) => {
        const locked = (await loadLeague(tx, leagueId, true)) as League;
        if (leagueStatus(locked, now()) !== "setup") return fail<null>(409, "the draft has already started");
        const members = await membersOf(tx, leagueId);
        const usedNames = new Set(members.map((m) => m.displayName));
        const botNames = BOT_NAMES.filter((n) => !usedNames.has(n));
        for (let seat = 0; seat < locked.size; seat++) {
          if (members.some((m) => m.seat === seat)) continue;
          await tx.insert(leagueMembers).values({ leagueId, userId: null, displayName: botNames.shift() ?? `Bot ${seat + 1}`, seat });
        }
        await tx.update(leagues).set({ draftStartedAt: now() }).where(eq(leagues.id, leagueId));
        await advanceDraft(tx, locked, pool);
        return ok(null);
      });
      return result.ok ? state(leagueId, viewer) : result;
    },

    async pick(viewer: Viewer, leagueId: string, accountId: string): Promise<Result<LeagueState>> {
      const league = await loadLeague(db, leagueId);
      if (!league) return fail(404, "league not found");
      const pool = await draftPool(db, league.weekId);
      if (!pool.some((t) => t.accountId === accountId)) return fail(400, "that trader is not in this week's pool");

      const result = await db.transaction(async (tx) => {
        const locked = (await loadLeague(tx, leagueId, true)) as League;
        if (leagueStatus(locked, now()) !== "drafting") return fail<null>(409, "the draft is not running");
        const members = await membersOf(tx, leagueId);
        const me = members.find((m) => m.userId === viewer.userId);
        if (!me) return fail<null>(403, "you are not in this league");
        const made = await tx.select({ a: picks.accountId }).from(picks).where(eq(picks.leagueId, leagueId));
        if (seatForPick(made.length, locked.size) !== me.seat) return fail<null>(409, "it is not your turn");
        if (made.some((p) => p.a === accountId)) return fail<null>(409, "that trader has already been drafted");
        await tx.insert(picks).values({ leagueId, pickNo: made.length, memberId: me.id, accountId });
        await advanceDraft(tx, locked, pool);
        return ok(null);
      });
      return result.ok ? state(leagueId, viewer) : result;
    },

    async setLineup(viewer: Viewer, leagueId: string, input: LineupRequest): Promise<Result<LeagueState>> {
      const league = await loadLeague(db, leagueId);
      if (!league) return fail(404, "league not found");
      const status = leagueStatus(league, now());
      if (status !== "ready") return fail(409, lineupLocked(status) ? "lineups are locked for this week" : "finish the draft first");
      const members = await membersOf(db, leagueId);
      const me = members.find((m) => m.userId === viewer.userId);
      if (!me) return fail(403, "you are not in this league");
      const roster = (await db.select({ a: picks.accountId }).from(picks).where(and(eq(picks.leagueId, leagueId), eq(picks.memberId, me.id)))).map(
        (r) => r.a,
      );
      const problem = lineupError(input, roster);
      if (problem) return fail(400, problem);
      await db
        .insert(lineups)
        .values({ memberId: me.id, ...input, updatedAt: now() })
        .onConflictDoUpdate({ target: lineups.memberId, set: { ...input, updatedAt: now() } });
      return state(leagueId, viewer);
    },

    async play(viewer: Viewer, leagueId: string): Promise<Result<LeagueState>> {
      const league = await loadLeague(db, leagueId);
      if (!league) return fail(404, "league not found");
      if (league.ownerId !== viewer.userId) return fail(403, "only the league owner can play the week");
      const replay = league.draftCompletedAt !== null && league.draftCompletedAt.getTime() >= weekBounds(league.weekId).end.getTime();
      if (!replay || leagueStatus(league, now()) !== "ready") return fail(409, "only a drafted replay league can be played");
      await db.update(leagues).set({ playedAt: now() }).where(eq(leagues.id, leagueId));
      return state(leagueId, viewer);
    },

    async mine(viewer: Viewer): Promise<LeagueSummary[]> {
      const rows = await db
        .select({ leagueId: leagueMembers.leagueId })
        .from(leagueMembers)
        .where(eq(leagueMembers.userId, viewer.userId));
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
  };
}
