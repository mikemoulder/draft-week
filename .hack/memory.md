# Project memory

## What this is

FTL (Fantasy Trading League, working name until 2026-10-21 was Draft Week) is a fantasy league for Strike Finance, a perpetuals exchange on Cardano. Players sign in with
their wallet, pick five real Strike traders within a credit budget, name a captain, and score points every day from those
traders' real trades on Strike. Built for the Strike Hackathon (Oct 21 to 23, 2026).

## Stack

```text
apps/web          Next.js App Router, TypeScript, Tailwind. Vercel
apps/api          Hono on Node, Drizzle ORM, Postgres 16, ingest worker. docker compose on the VPS
packages/shared   zod schemas + types
Auth              wallet sign-in: Cardano CIP-30 (@cardano-foundation/cardano-verify-datasignature), then Solana, Ethereum
Strike            public REST only for the core game; builder codes only if "trade with my captain" ships
```

## Architecture

The browser talks only to the Vercel origin. Vercel rewrites `/api/*` to the API on the VPS
(Caddy, TLS) with a shared secret header, so the session cookie is first-party. The API owns all
rules (auth, leagues, scoring) and the database. An ingest worker pulls Strike fills every 5 minutes
and recomputes per-day points. Full design: `.hack/plan/architecture-brief.md`.

## Decisions

```text
Fantasy league (FTL, formerly Draft Week) as the project
  why:        user preference; "social trading" is a named area in the announcement; validated on real data
  instead of: Domino (liquidation cascade + SLP vault stress test). Deeper integration, less fun. Runner-up

Free to play; prize pot funded by builder fees on trades routed through the app
  why:        entry-fee pools are zero-sum (losers fund winners) and read as gambling
  instead of: entry fees in STRIKE (rejected); referral revenue (rejected: only pays on new sign-ups)

FPL-style budget squads instead of a snake draft (2026-10-22)
  why:        user asked for Fantasy Premier League mechanics: 200 credits, traders priced 20-60 and graded
              A+ to D, non-exclusive picks, bonus credits for the player's own 7-day Strike volume
              ($1k +10, $10k +20, $50k +35, $250k +50 cap; the user bumped the first tiers as too small)
  instead of: an 8-seat snake draft with exclusive picks (confusing, and friends could not share a star)

Rank-based daily scoring (1..10 by decile, -5 liquidation, captain x1.5, auto-sub)
  why:        50% close games vs 13% for raw-return scoring on the week to 2026-10-21
  instead of: points = % return, where one liquidation decided the game on day one

Web on Vercel, API + db + ingest on the user's VPS, joined by a Vercel rewrite
  why:        user requirement (Vercel frontend, own VPS); rewrite keeps cookies first-party and avoids CORS
  instead of: all-Vercel + Neon (Hobby crons are daily only); all-VPS (user wants Vercel for the frontend)

Wallet sign-in, Cardano first
  why:        249 of 260 active Strike traders with a listed wallet are on Cardano
  instead of: email or passwords

No custody of trading keys
  why:        a key that can trade is a liability; Strike API wallets are per device by design

Matchups: managers meet in join order (1st v 2nd, 3rd v 4th), bots take the rest (2026-10-23)
  why:        the old outside-in seat pairing put the owner against a bot and friends never met (user test note)
  instead of: random draws (harder to explain, and the page could not preview them)

Network first, then wallet, at sign-in (2026-10-23)
  why:        a Strike account lives on one network and OKX shows under several; the user loaded the wrong one
  instead of: one mixed list of every wallet on every chain

League size is a cap, bots only make up the numbers (2026-10-23)
  why:        the user wants events with as many people as possible; filling 500 seats with bots made most
              players face a bot. Cap 8..500; at kick-off bots bring it to max(8, even). 300 managers measured:
              0 bots, state ~50 ms, 150 KB. Polling slows to 15 s / 30 s for big leagues
  instead of: fixed 8 seats; then 8-20 even seats filled with bots

No picking your own Strike account (2026-10-23)
  why:        the obvious way to game the game; the API refuses it and the list marks it "You"
  open risk:  one person with two accounts hedging between them. Limited, not prevented: stated on /how-it-works
```

## Constraints

```text
Strike API base paths       /v2 trading + accounts, /price/v2 market data, /stat/v1 stats. Docs prose omits this
Cloudflare on Strike        default Python urllib User-Agent gets 403 "error code: 1010". Always set a UA
Strike rate limit           2,400 request weight/min, 1,200 orders/min (weights per endpoint unpublished)
Strike price WS             several JSON messages per frame, newline separated
Strike testnet              4 markets, near-empty book. Useless for demos. Read mainnet
Public account data         fills, positions, account by account_id / blockchain_address / vault_id, no auth
Fill liquidation flag       auto_close_type in ('liquidation','adl','bankrupt','if_transfer','vault_withdrawal')
Forward polling             /v2/history/fill?since_trade_id=  (ascending), limit max 1000
Sub-accounts                some traders trade through sub-accounts; their fills are not public (sub_account_id
                            needs auth). Leaderboard counts include them, our fills do not. Pool uses our fills only
Fill paging                 fillsBefore: newest first, fromId = fill id. fillsSince: ascending by trade_id. limit<=1000
Builder connect             needs a registered builder code (fake code -> 404 "builder code not found")
strike-builder-reference    no license. Learn from it, do not copy it
VPS                         shared with other apps; 31 GB free disk (79% used); sudo needs the user
Docker on the VPS           docker.io 29 + system compose v1 only. We use Compose v5.6.0 installed per user in
                            ~/.docker/cli-plugins (sha256 verified). Run docker via `sg docker -c` until re-login
Production checkout         ~/deploy/draft-week (separate clone + .env). Compose project "draftweek", ports
                            127.0.0.1:3940 (api) and 127.0.0.1:5440 (db)
```

## Known issues

```text
Leaderboard roi field       unreliable (e.g. roi 2733 with pnl 2733). Compute returns from fills
/stat dashboard summary     open_interest_usd always "0"
Leaderboard time_range      only 24h, 7d, 30d, all_time
```

## What is real, what is recorded

**Real:** every trader, trade, liquidation and point comes from Strike mainnet, ingested into our database
(worker every 5 min; backfill reaches the start of the week before last).
**Recorded:** nothing yet. The replay week is real historical data, not a fixture.

## Verification

```bash
npm run typecheck
npm test
npm run build
```

The demo path is verified in a browser on the deployed URL, not by a green build.
