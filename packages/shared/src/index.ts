// The contract between apps/web and apps/api. Request bodies are validated with these
// schemas on the API; responses are typed with them on the web. Change with care: both
// apps break together, which is the point.
import { z } from "zod";

export const Chain = z.enum(["cardano", "solana", "ethereum"]);
export type Chain = z.infer<typeof Chain>;

// ── Auth ────────────────────────────────────────────────────────────────────

export const ChallengeRequest = z.object({
  chain: Chain,
  address: z.string().min(20).max(200),
});
export type ChallengeRequest = z.infer<typeof ChallengeRequest>;

export const ChallengeResponse = z.object({
  nonce: z.string(),
  message: z.string(),
  expiresAt: z.number(),
});
export type ChallengeResponse = z.infer<typeof ChallengeResponse>;

// Cardano wallets return a COSE key alongside the signature; other chains do not.
export const VerifyRequest = z.object({
  nonce: z.string(),
  signature: z.string().min(1).max(4000),
  key: z.string().max(400).optional(),
});
export type VerifyRequest = z.infer<typeof VerifyRequest>;

export const Wallet = z.object({ chain: Chain, address: z.string() });
export type Wallet = z.infer<typeof Wallet>;

export const Me = z.object({
  id: z.string(),
  displayName: z.string(),
  wallets: z.array(Wallet),
});
export type Me = z.infer<typeof Me>;

// ── Traders ─────────────────────────────────────────────────────────────────

export const TraderStyle = z.enum(["scalper", "swing", "degen", "steady"]);
export type TraderStyle = z.infer<typeof TraderStyle>;

export const WeekStats = z.object({
  points: z.number(),
  pnl: z.number(),
  trades: z.number(),
  activeDays: z.number(),
  winRate: z.number().nullable(),
  liquidations: z.number(),
});
export type WeekStats = z.infer<typeof WeekStats>;

// Pool cards show the week BEFORE the league's week, so nobody drafts with hindsight.
export const PoolTrader = z.object({
  accountId: z.string(),
  name: z.string(),
  style: TraderStyle,
  prevWeek: WeekStats,
});
export type PoolTrader = z.infer<typeof PoolTrader>;

export const WeekStatus = z.enum(["final", "live", "upcoming"]);
export type WeekStatus = z.infer<typeof WeekStatus>;

// A week can host a league when its previous week has data to draft from.
export const WeekInfo = z.object({
  id: z.string(),
  status: WeekStatus,
  startsAt: z.number(),
  endsAt: z.number(),
  draftable: z.number(),
});
export type WeekInfo = z.infer<typeof WeekInfo>;

// ── Leagues ─────────────────────────────────────────────────────────────────

export const LeagueStatus = z.enum(["drafting", "locked", "live", "final"]);
export type LeagueStatus = z.infer<typeof LeagueStatus>;

export const CreateLeagueRequest = z.object({
  name: z.string().trim().min(2).max(40),
  weekId: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type CreateLeagueRequest = z.infer<typeof CreateLeagueRequest>;

export const JoinLeagueRequest = z.object({
  inviteCode: z.string().trim().min(4).max(16),
});
export type JoinLeagueRequest = z.infer<typeof JoinLeagueRequest>;

export const PickRequest = z.object({ accountId: z.string() });
export type PickRequest = z.infer<typeof PickRequest>;

export const LineupRequest = z.object({
  captainId: z.string(),
  starters: z.array(z.string()).length(3),
  bench: z.array(z.string()).length(2),
});
export type LineupRequest = z.infer<typeof LineupRequest>;

export const Member = z.object({
  id: z.string(),
  name: z.string(),
  isBot: z.boolean(),
  seat: z.number(),
});
export type Member = z.infer<typeof Member>;

export const Pick = z.object({
  pickNo: z.number(),
  memberId: z.string(),
  accountId: z.string(),
});
export type Pick = z.infer<typeof Pick>;

export const Lineup = LineupRequest.extend({ memberId: z.string() });
export type Lineup = z.infer<typeof Lineup>;

export const DayPoints = z.object({
  accountId: z.string(),
  day: z.number(),
  points: z.number(),
  liquidated: z.boolean(),
});
export type DayPoints = z.infer<typeof DayPoints>;

export const ReplayEvent = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("liquidation"), day: z.number(), accountId: z.string(), at: z.number() }),
  z.object({ kind: z.literal("autosub"), day: z.number(), memberId: z.string(), out: z.string(), in: z.string() }),
  z.object({ kind: z.literal("leadChange"), day: z.number(), matchupId: z.string(), leaderId: z.string() }),
]);
export type ReplayEvent = z.infer<typeof ReplayEvent>;

export const Matchup = z.object({
  id: z.string(),
  a: z.string(),
  b: z.string(),
  daily: z.array(z.tuple([z.number(), z.number()])),
  events: z.array(ReplayEvent),
});
export type Matchup = z.infer<typeof Matchup>;

export const LeagueState = z.object({
  id: z.string(),
  name: z.string(),
  weekId: z.string(),
  status: LeagueStatus,
  inviteCode: z.string(),
  members: z.array(Member),
  picks: z.array(Pick),
  onTheClock: z.string().nullable(),
  lineups: z.array(Lineup),
  matchups: z.array(Matchup),
  standings: z.array(z.object({ memberId: z.string(), points: z.number() })),
  points: z.array(DayPoints),
});
export type LeagueState = z.infer<typeof LeagueState>;

// ── Operations ──────────────────────────────────────────────────────────────

export const Health = z.object({
  ok: z.boolean(),
  db: z.boolean(),
  lastIngestAt: z.number().nullable(),
  version: z.string(),
});
export type Health = z.infer<typeof Health>;

export const ApiError = z.object({ error: z.string() });
export type ApiError = z.infer<typeof ApiError>;
