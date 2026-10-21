# Project memory

## What this is

Draft Week is a fantasy league for Strike Finance, a perpetuals exchange on Cardano. Players sign in with
their wallet, draft five real Strike traders, pick a captain, and score points every day from those
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
Fantasy league (Draft Week) as the project
  why:        user preference; "social trading" is a named area in the announcement; validated on real data
  instead of: Domino (liquidation cascade + SLP vault stress test). Deeper integration, less fun. Runner-up

Free to play; prize pot funded by builder fees on trades routed through the app
  why:        entry-fee pools are zero-sum (losers fund winners) and read as gambling
  instead of: entry fees in STRIKE (rejected); referral revenue (rejected: only pays on new sign-ups)

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
Builder connect             needs a registered builder code (fake code -> 404 "builder code not found")
strike-builder-reference    no license. Learn from it, do not copy it
VPS                         shared with other apps; 33 GB free disk (78% used); sudo needs the user
```

## Known issues

```text
Leaderboard roi field       unreliable (e.g. roi 2733 with pnl 2733). Compute returns from fills
/stat dashboard summary     open_interest_usd always "0"
Leaderboard time_range      only 24h, 7d, 30d, all_time
```

## What is real, what is recorded

**Real:** every trader, trade, liquidation and point comes from Strike mainnet, ingested into our database.
**Recorded:** nothing yet. The replay week is real historical data, not a fixture.

## Verification

```bash
npm run typecheck
npm test
npm run build
```

The demo path is verified in a browser on the deployed URL, not by a green build.
