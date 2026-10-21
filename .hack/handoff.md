# Handoff

**As of:** `310cc09` · Wed 2026-10-21 ~21:15 UTC · auth session

## Next step

Data phase. In `apps/api/src/db/schema.ts` add traders, fills, ingest_state, weeks, trader_days; generate
migration `data`. Then `apps/api/src/strike.ts` (the only Strike caller: UA header, base paths, retries) and
`src/domain/ingest/` (leaderboard -> traders, fills with since_trade_id, trader_days recompute) with tests
against the throwaway db, then `src/worker.ts` + an `ingest` service in docker-compose.yml.

Waiting on the user: a real-wallet sign-in on https://draft-week.vercel.app/signin (Lace/Eternl or Phantom).

## Current status

**Working (production):** wallet sign-in end to end through Vercel -> VPS; server-side sessions; logout.
**Deployed:** web https://draft-week.vercel.app (310cc09), API https://draftweek-api.duckdns.org/health (194a620).
**Build:** green.

## Verified

```text
Ran:     TEST_DATABASE_URL=postgres://postgres:test@127.0.0.1:5441/postgres npx vitest run  (apps/api)
Result:  24 passed: proxy secret + health (5), address/message/signature units (9), sign-in flow on Postgres (10)
Ran:     production check through https://draft-week.vercel.app/api with a generated Cardano wallet
Result:  challenge -> verify 200, Set-Cookie arrives via Vercel (HttpOnly; Secure; SameSite=Lax),
         /me 200 with matching address, logout 204, /me after logout 401. Test user deleted afterwards
Ran:     web eslint, typecheck, build -> clean
Not yet: a real browser wallet extension (CIP-30 signData from Lace/Eternl, Phantom signMessage)
```

## Do not repeat

```text
GET /v2/exchangeInfo                       404. Market data lives under /price/v2/*
Python urllib default User-Agent           Cloudflare 403 "error code: 1010"
JSON.parse on a /ws/price frame            frames hold several newline-separated messages
`docker compose` with the system install   not available (compose v1 only). Plugin is in ~/.docker/cli-plugins
pkill -f "<pattern>" in a compound command  matches its own shell and kills it. Use pgrep, then kill <pid>
tsc in apps/web without typegen            RouteContext / LayoutProps missing. Script runs `next typegen` first
tsx on a .ts file outside the repo         treated as CJS, top-level await fails. Use .mts
Static-only app with localStorage leagues  rejected by the user: needs accounts and cross-device state
Entry-fee prize pools, referral funding    rejected: zero-sum / only pays on new users
```

## Remaining work (commit roadmap)

```text
1. Foundation        DONE
2. Auth              DONE (Cardano + Solana). Ethereum deferred (6 of 260 traders). Real-wallet check pending
3. Data              schema, ingest worker, trader_days, scoring + tests, backfill                    (~10)
4. Leagues           create/join, draft turns + bots, lineup, league state + tests                    (~10)
5. UI                dashboard, draft room, lineup, matchup replay (the aha), trader page             (~12)
6. Hardening         states, mobile, README, demo video, make repo public, submit                    (~6)
Cut order if late:   trade with captain -> live leagues -> Solana/Ethereum sign-in -> friends drafting
```

## Context the next person needs

- Repo is private until submission; it must be public before submitting.
- Deadline time zone unconfirmed (10:00 "EST"). Plan assumes 14:00 UTC and submits by 12:00 UTC.
- Production backend runs from `~/deploy/draft-week`, not from the dev checkout.
