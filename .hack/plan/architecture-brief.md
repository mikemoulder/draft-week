# Architecture brief: FTL, Fantasy Trading League (v3)

> v3, 2026-10-21 18:40 UTC. Frontend on Vercel, backend (API, database, ingest) on the user's VPS.
> Supersedes v1 (static app) and v2 (all on one host).

## Summary

```text
Frontend:   Next.js App Router on Vercel                      draft-week.vercel.app
Backend:    Node API (Hono) + Postgres 16 + ingest worker      docker compose on the VPS, api.draftweek.duckdns.org
Contract:   one shared package of zod schemas and types; the web app calls the API through a typed client
Auth:       sign in with the wallet people already trade with (Cardano first, then Solana, Ethereum). Server sessions
Same-origin: the browser only ever talks to draft-week.vercel.app. Vercel rewrites /api/* to the VPS, so the
            session cookie is first-party and nothing needs CORS
Repo:       one GitHub repo, npm workspaces: apps/web, apps/api, packages/shared
```

## Why this shape

```text
Vercel        preview deploy per branch, CDN for the UI, zero ops for the part judges look at
VPS           no serverless limits for ingest (long-running loop), Postgres next to the API, already has Caddy + TLS
The proxy     one origin for the browser: first-party cookies (Safari/Chrome block third-party ones),
              no CORS, and the VPS address never appears in the client
```

## What a user can do

```text
Sign in with a wallet on any device -> see their leagues -> create a league or join by invite link ->
draft with friends (bots fill empty seats) -> set captain and bench -> follow live scores during the week
-> or play a replay league on a finished week (the demo path)
```

## The demo path

| # | User action | UI shows | Backend does | Persists |
|---|---|---|---|---|
| 1 | Sign in with Lace / Eternl / Phantom / MetaMask | their leagues; their own Strike stats if that wallet trades on Strike | challenge, signature verify, session | `users`, `wallets`, `sessions` |
| 2 | Create league (replay week 2026-10-12) | invite link | league, 8 seats, snake order | `leagues`, `league_members` |
| 3 | Draft vs bots (or friends) | draft room, pool cards with **pre-week** stats, picks arriving | turn check in a transaction, bots pick after | `picks` |
| 4 | Captain, starters, bench | lineup | membership + roster check | `lineups` |
| **5** | **Open matchup / replay** | **scores tick day by day, liquidation flash, auto-sub, lead change; game of the week first** | **standings and events from `trader_days`** | nothing new |
| 6 | Open on a phone, same wallet | same league, same lineup | new session from wallet sign-in | `sessions` |
| 7 | Tap a trader | real trades, positions, liquidations | ingested fills + live positions from Strike | nothing |

**Aha step:** 5. It reads only our database, so a Strike outage cannot touch it.

## Diagram

```text
            Browser (any device)
                  │  https://draft-week.vercel.app   (pages + /api/*, one origin, session cookie)
                  ▼
   [Web]  apps/web on Vercel ── rewrite /api/* ──►  [Caddy]  api.draftweek.duckdns.org (TLS, on the VPS)
                                                        │
                                                        ▼
                                                 [API]  apps/api (Hono, container "api", 127.0.0.1:3940)
                                                   │                        │
                                                   ▼                        ▼
                                          [Postgres]  container "db"    [Strike API]  api.strikefinance.org
                                                   ▲                        ▲
                                                   └── [Ingest]  container "ingest", every 5 min ──┘
```

Seven boxes. Each is a folder, a container or a URL.

## Repo layout

```text
apps/web/                Next.js App Router (Vercel root directory). UI only, no database access
  app/                   sign-in, dashboard, league, draft room, matchup, trader pages
  lib/api.ts             typed client (hono/client) against /api
  next.config.ts         rewrites: /api/:path* -> ${API_ORIGIN}/:path*
apps/api/                Hono on Node
  src/routes/            thin handlers: validate -> domain -> respond
  src/domain/auth/       challenge, per-chain verification, sessions
  src/domain/leagues/    create, join, draft turns, bots, lineup rules
  src/domain/scoring/    day points, auto-sub, matchups, events (pure functions)
  src/domain/ingest/     Strike pull, fills upsert, trader_days recompute
  src/strike.ts          the only module that calls Strike
  src/db/                Drizzle schema + committed migrations
  src/worker.ts          ingest loop entrypoint
  Dockerfile
packages/shared/         zod schemas + inferred types used by both apps
tests/                   Vitest: scoring, draft turns, auth verification, ingest aggregation
docker-compose.yml       api, db, ingest (VPS)
deploy/Caddyfile.snippet the site block for the VPS
.github/workflows/ci.yml typecheck, lint, test on every push
```

## Data model

```text
users            id, display_name, created_at
wallets          id, user_id, chain (cardano|solana|ethereum), address (unique), created_at
auth_challenges  nonce (pk), chain, address, message, expires_at, used_at          single use, 5 min
sessions         id (random 32 bytes, pk), user_id, created_at, expires_at, revoked_at

traders          account_id (pk), name, ada_handle, nickname, chain, opted_out, first_seen_at
fills            id (strike fill id, pk), account_id, trade_id, symbol, side, ts, realized_pnl, fee, auto_close_type
ingest_state     account_id (pk), last_trade_id, last_run_at, last_error
weeks            id ('2026-10-12'), starts_at, ends_at, status (upcoming|live|final)
trader_days      week_id, account_id, day (0-6), pnl, trades, wins, liquidations, points, scoring_version
                 pk (week_id, account_id, day)

leagues          id, week_id, name, owner_id, invite_code (unique), size (8), status (drafting|locked|live|final), created_at
league_members   id, league_id, user_id (null = bot), display_name, seat (0-7), unique(league_id, seat)
picks            league_id, pick_no, member_id, account_id, created_at
                 unique(league_id, pick_no), unique(league_id, account_id)     <- no double picks, by constraint
lineups          member_id (pk), captain_id, starters text[3], bench text[2], updated_at
```

- Draft pool cards show the **previous week's** stats, so a replay league cannot be drafted with hindsight.
- `scoring_version` keeps results reproducible if the rules change.
- Standings are computed on read from `trader_days` (8 x 5 x 7 = 280 rows).

## API surface (served at /api/* through the proxy)

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/challenge` | nonce + message to sign for {chain, address} |
| POST | `/auth/verify` | verify signature, upsert user + wallet, set session cookie |
| POST | `/auth/logout` | revoke session |
| GET | `/me` | user, wallets, leagues |
| GET | `/weeks/:id/pool` | draftable traders with pre-week stats |
| GET | `/traders/:id` | trader profile, fills, open positions |
| POST | `/leagues` | create league for a week |
| POST | `/leagues/join` | join by invite code |
| GET | `/leagues/:id` | league state: draft board, lineups, standings, matchups, events |
| POST | `/leagues/:id/picks` | draft pick (turn checked server-side; bots pick after) |
| PUT | `/leagues/:id/lineup` | captain, starters, bench |
| GET | `/health` | db reachable, last ingest time (for Caddy and the admin line) |

Twelve endpoints. Every body validated with the shared zod schemas. The draft room polls `GET /leagues/:id`
every 2 s while drafting. No websockets.

## Shared types (packages/shared)

```ts
export type Chain = "cardano" | "solana" | "ethereum";
export type Me = { id: string; displayName: string; wallets: { chain: Chain; address: string }[] };
export type PoolTrader = {
  accountId: string; name: string; style: "scalper" | "swing" | "degen" | "steady";
  prevWeek: { pnl: number; trades: number; activeDays: number; winRate: number | null; liquidations: number };
};
export type LeagueStatus = "drafting" | "locked" | "live" | "final";
export type Member = { id: string; name: string; isBot: boolean; seat: number };
export type Pick = { pickNo: number; memberId: string; accountId: string };
export type Lineup = { memberId: string; captainId: string; starters: string[]; bench: string[] };
export type DayPoints = { accountId: string; day: number; points: number; liquidated: boolean };
export type ReplayEvent =
  | { kind: "liquidation"; day: number; accountId: string; at: number }
  | { kind: "autosub"; day: number; memberId: string; out: string; in: string }
  | { kind: "leadChange"; day: number; matchupId: string; leaderId: string };
export type Matchup = { id: string; a: string; b: string; daily: [number, number][]; events: ReplayEvent[] };
export type LeagueState = {
  id: string; name: string; weekId: string; status: LeagueStatus; inviteCode: string;
  members: Member[]; picks: Pick[]; onTheClock: string | null; lineups: Lineup[];
  matchups: Matchup[]; standings: { memberId: string; points: number }[]; points: DayPoints[];
};
```

## Scoring rules (v1, validated on real data)

```text
Per day, rank every trader who traded by net return (realized pnl - fees) / equity: 1..10 by decile.
No trades = 0. Any liquidation, ADL or bankruptcy that day = -5. Captain x1.5.
Starters 3, bench 2. A starter with no trades that day is replaced by the first bench pick who traded.
```

## VPS layout

```text
docker compose project "draftweek"
  api      apps/api image                    127.0.0.1:3940  -> Caddy api.draftweek.duckdns.org
  db       postgres:16, named volume          127.0.0.1:5440  (localhost only: migrations, psql)
  ingest   apps/api image, `node dist/worker.js`, every 5 min, lock row so runs never overlap
Limits     api 512 MB, ingest 256 MB, db 512 MB. The box has ~5.5 GB available
Backups    nightly pg_dump to ~/backups/draftweek, keep 7
Deploy     git pull && docker compose up -d --build && docker image prune -f
Touches    only this compose project and one new Caddy block (backed up, validated before reload)
```

## Security

```text
Sign-in:      challenge with domain, nonce, issued-at, expiry; single use. Verified on the API per chain:
              Cardano CIP-30 signData (COSE_Sign1, key hash must match the address), Solana ed25519,
              Ethereum EIP-191 personal_sign
Sessions:     random id in an httpOnly, Secure, SameSite=Lax, host-only cookie on draft-week.vercel.app,
              stored server-side, revocable, 30 days
Proxy trust:  the API only accepts requests carrying X-Proxy-Secret (added by the Vercel rewrite via an env var),
              so the duckdns hostname cannot be used to bypass the web origin. /health is exempt
Database:     never exposed publicly; only the api and ingest containers reach it
Secrets:      VPS: .env (chmod 600, gitignored) with DATABASE_URL, POSTGRES_PASSWORD, PROXY_SECRET.
              Vercel: API_ORIGIN, PROXY_SECRET. Nothing secret is NEXT_PUBLIC_
Authorization: every league write checks membership; picks checked against turn order in a transaction
Input:        shared zod schemas on every route; account ids checked against the traders table
Trading keys: not stored by us. If "trade with my captain" ships, the Strike API key stays on the device
              that created it; a new device reconnects with one signature
```

## External dependencies

| Dependency | Used for | If it fails |
|---|---|---|
| Strike leaderboard + fills (ingest) | traders, fills, day points | `ingest_state.last_error`, retried next run; the app serves what it has |
| Strike positions (live read) | trader page | section shows "unavailable", page still renders |
| Wallet extensions | sign-in | per-wallet error; other wallets still work |
| VPS (api, db) | everything after the landing page | restart policies, `/health`; landing page and static assets stay up on Vercel |

## Rate budget

```text
Longest operation:   full ingest of ~200 traders, ~60 s measured. Incremental runs use since_trade_id
Strike limits:       2,400 request weight/min published. Ingest concurrency 4
Proxy latency:       Vercel edge -> VPS adds one hop. Draft polling every 2 s is fine at this size
```

## Build order and checkpoints (UTC)

```text
Wed 18:45-20:30   repo + workspaces + CI; compose (db, api) with /health; Vercel project with the rewrite;
                  verify: cookie set by the API arrives first-party through the rewrite      [needs: you, see below]
Wed 20:30-23:30   Cardano sign-in end to end (riskiest), then Solana + Ethereum; sessions; /me
Thu 07:00-10:00   ingest worker + trader_days + scoring (tests); backfill week 2026-10-12 and the current week
Thu 10:00-14:00   leagues: create, join, draft turns, bots, lineup (tests)
Thu 14:00-21:00   UI: dashboard, draft room, lineup, matchup replay (the aha), trader page
Thu 21:00-23:00   full demo path on production; fix what breaks
Fri 06:00-10:30   empty/loading/error states, mobile pass, README, demo video
Fri 10:30         feature freeze. Submit by 12:00 (deadline 14:00 UTC if EDT)
```

About 29 hours of work against about 28 available. The cut list is real.

## Cut list (in this order)

```text
1. Trade with my captain (builder code)
2. Live current-week leagues -> replay leagues only (ingest keeps running)
3. Solana and Ethereum sign-in -> Cardano only (249 of 260 active traders with a listed wallet are on Cardano)
4. Friends drafting together -> you vs bots, invite link shows the finished league
```

## Risks

| Risk | Detected by | Fallback |
|---|---|---|
| Set-Cookie not passed through the Vercel rewrite | first deploy tonight (checkpoint 1) | Next.js route handler as a thin proxy (`app/api/[...path]/route.ts`) that forwards headers explicitly |
| Cardano signData verification is fiddly | first auth task tonight | non-negotiable (96% of traders): use a maintained verifier library, not hand-rolled COSE parsing |
| Ingest stalls | `/health` shows last ingest older than 15 min | restart policy; demo week already backfilled |
| VPS disk at 78% | deploy script prints `df` | `docker image prune` on every deploy; data is small |
| Shared box disturbed | only this compose project and one Caddy block change | Caddyfile backup + `caddy validate` before reload |
```
