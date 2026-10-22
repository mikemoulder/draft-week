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
  // The Strike account behind the signed-in wallet, if it has one. Guests never do.
  strike: z.object({ accountId: z.string(), address: z.string() }).nullable(),
});
export type Me = z.infer<typeof Me>;

// ── Traders ─────────────────────────────────────────────────────────────────

export const TraderStyle = z.enum(["scalper", "swing", "degen", "steady"]);
export type TraderStyle = z.infer<typeof TraderStyle>;

export const WeekStats = z.object({
  points: z.number(),
  pnl: z.number(),
  // net pnl over average equity for the week, in percent: the profitability the grade is based on
  returnPct: z.number(),
  trades: z.number(),
  activeDays: z.number(),
  winRate: z.number().nullable(),
  liquidations: z.number(),
});
export type WeekStats = z.infer<typeof WeekStats>;

export const CardTier = z.enum(["legend", "gold", "silver", "bronze"]);
export type CardTier = z.infer<typeof CardTier>;

export const Grade = z.enum(["A+", "A", "B", "C", "D"]);
export type Grade = z.infer<typeof Grade>;

// Everything on a card comes from the week BEFORE the league's week, so nobody picks with hindsight.
// rating (55 to 99), tier and price come from where last week's points rank in the pool;
// grade comes from last week's return.
export const PoolTrader = z.object({
  accountId: z.string(),
  name: z.string(),
  style: TraderStyle,
  rating: z.number(),
  tier: CardTier,
  grade: Grade,
  price: z.number(),
  avatarUrl: z.string().nullable(),
  prevWeek: WeekStats,
});
export type PoolTrader = z.infer<typeof PoolTrader>;

export const TraderDay = z.object({ day: z.number(), points: z.number(), trades: z.number(), pnl: z.number(), liquidated: z.boolean() });
export const TraderFill = z.object({
  at: z.number(),
  symbol: z.string(),
  side: z.string(),
  size: z.number(),
  price: z.number(),
  pnl: z.number(),
  liquidation: z.boolean(),
});
// The detail panel for one trader: last week day by day, and their most recent trades.
export const TraderDetail = z.object({
  trader: PoolTrader,
  days: z.array(TraderDay),
  recentFills: z.array(TraderFill),
});
export type TraderDetail = z.infer<typeof TraderDetail>;

export const WeekStatus = z.enum(["final", "live", "upcoming"]);
export type WeekStatus = z.infer<typeof WeekStatus>;

// A week can host a league when its previous week has data to price traders from.
export const WeekInfo = z.object({
  id: z.string(),
  status: WeekStatus,
  startsAt: z.number(),
  endsAt: z.number(),
  draftable: z.number(),
});
export type WeekInfo = z.infer<typeof WeekInfo>;

// ── Budget ──────────────────────────────────────────────────────────────────

export const BASE_BUDGET = 200;
export const SQUAD_SIZE = 5;
// Extra credits from the manager's own Strike volume over the last 7 days. Highest tier reached wins.
export const VOLUME_BONUS_TIERS = [
  { minUsd: 250_000, credits: 50 },
  { minUsd: 50_000, credits: 35 },
  { minUsd: 10_000, credits: 20 },
  { minUsd: 1_000, credits: 10 },
] as const;

export function volumeBonus(volumeUsd: number): number {
  return VOLUME_BONUS_TIERS.find((t) => volumeUsd >= t.minUsd)?.credits ?? 0;
}

// ── Leagues ─────────────────────────────────────────────────────────────────

// picking: squads can be built and changed. live: the week is running, squads locked.
// final: results complete. A league on a finished week (replay) stays "picking" until its owner plays it.
export const LeagueStatus = z.enum(["picking", "live", "final"]);
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

// A squad is five traders: three starters, two on the bench, one starter as captain.
export const SquadRequest = z.object({
  captainId: z.string(),
  starters: z.array(z.string()).length(3),
  bench: z.array(z.string()).length(2),
});
export type SquadRequest = z.infer<typeof SquadRequest>;

export const Squad = SquadRequest.extend({ memberId: z.string(), spent: z.number() });
export type Squad = z.infer<typeof Squad>;

export const Member = z.object({
  id: z.string(),
  name: z.string(),
  isBot: z.boolean(),
  seat: z.number(),
  hasSquad: z.boolean(),
  budget: z.number(), // base + this member's trading bonus
  bonus: z.number(),
});
export type Member = z.infer<typeof Member>;

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

export const LeagueSummary = z.object({
  id: z.string(),
  name: z.string(),
  weekId: z.string(),
  status: LeagueStatus,
  members: z.number(),
  myPoints: z.number().nullable(),
  myRank: z.number().nullable(),
});
export type LeagueSummary = z.infer<typeof LeagueSummary>;

export const LeagueState = z.object({
  id: z.string(),
  name: z.string(),
  weekId: z.string(),
  status: LeagueStatus,
  replay: z.boolean(),
  inviteCode: z.string(),
  size: z.number(),
  ownerMemberId: z.string(),
  myMemberId: z.string().nullable(),
  // Days of the week whose results are visible: 7 when final, today's index + 1 when live, else 0.
  daysRevealed: z.number(),
  members: z.array(Member),
  // Your own squad always; everyone's once the week is live or final.
  squads: z.array(Squad),
  matchups: z.array(Matchup),
  standings: z.array(z.object({ memberId: z.string(), points: z.number() })),
  points: z.array(DayPoints),
  traders: z.array(z.object({ accountId: z.string(), name: z.string(), style: TraderStyle, avatarUrl: z.string().nullable() })),
});
export type LeagueState = z.infer<typeof LeagueState>;

// ── Strike accounts ─────────────────────────────────────────────────────────

export const StrikeAccountsRequest = z.object({ chain: Chain, addresses: z.array(z.string().min(20).max(200)).min(1).max(20) });
// `input` is the address exactly as the wallet gave it (hex for Cardano); `address` is Strike's form.
export const StrikeAccount = z.object({ input: z.string(), address: z.string(), accountId: z.string(), blockchain: z.string() });
export type StrikeAccount = z.infer<typeof StrikeAccount>;

// ── Showcase (public, landing page) ────────────────────────────────────────

export const ShowcaseStats = z.object({
  tradersFollowed: z.number(),
  tradesLastWeek: z.number(),
  liquidationsLastWeek: z.number(),
  draftableThisWeek: z.number(),
  lastIngestAt: z.number().nullable(),
});
export type ShowcaseStats = z.infer<typeof ShowcaseStats>;

// A league of eight bots drafted from a finished week's real pool and scored on real trades.
export const Showcase = z.object({
  league: LeagueState,
  featuredMatchupId: z.string(),
  stats: ShowcaseStats,
  // This week's top cards (rated on last week), for the landing page's hand of cards.
  stars: z.array(PoolTrader),
});
export type Showcase = z.infer<typeof Showcase>;

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
