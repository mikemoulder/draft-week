# Handoff

**As of:** `79e37fd` · Wed 2026-10-21 ~19:00 UTC · foundation session

## Next step

Vercel: user imports `MikeMoulder/draft-week` with root directory `apps/web` and env vars `API_ORIGIN`
(https://draftweek-api.duckdns.org) and `PROXY_SECRET` (from `~/deploy/draft-week/.env`). Then open the
Vercel URL and confirm the status line reads "Backend online". If the Vercel URL is not
draft-week.vercel.app, update `WEB_ORIGIN` in `~/deploy/draft-week/.env` and redeploy the API.

In parallel: start the Auth phase. `apps/api/src/db/schema.ts` (users, wallets, auth_challenges, sessions),
first migration, then `POST /auth/challenge` + `POST /auth/verify` for Cardano using
`@cardano-foundation/cardano-verify-datasignature` (spike: `.hack/recon/spike/cardano_signin_spike.cjs`).

## Current status

**Working:** API + Postgres live on the VPS; `/health` public; every other route requires the proxy secret.
Web app proxies `/api/*` to the API (verified locally against production).
**Deployed:** API https://draftweek-api.duckdns.org/health (build 69af63f). Web: not yet on Vercel.
**Build:** green (typecheck all workspaces, api tests 5/5, web build, api bundle)

## Verified

```text
Ran:     npm run typecheck (shared, api, web)         -> pass
Ran:     npm test -w @draftweek/api                   -> 5 passed (proxy secret + health)
Ran:     npm run build -w @draftweek/web              -> pass (/ static, /api/[...path] dynamic)
Ran:     bash deploy/deploy-api.sh in ~/deploy/draft-week -> health {"ok":true,"db":true}
Checked: curl https://draftweek-api.duckdns.org/health -> 200; /me without secret -> 403
Checked: next dev against production API: /api/health 200 with no content-encoding; /api/me 404 (secret accepted)
Not yet: Set-Cookie passthrough (no endpoint sets a cookie yet). Check when /auth/verify lands
```

## Do not repeat

```text
GET /v2/exchangeInfo                       404. Market data lives under /price/v2/*
Python urllib default User-Agent           Cloudflare 403 "error code: 1010"
JSON.parse on a /ws/price frame            frames hold several newline-separated messages
`docker compose` with the system install   not available (compose v1 only). Plugin is in ~/.docker/cli-plugins
pkill -f "<pattern>" in a compound command  matches its own shell and kills it. Use pgrep, then kill <pid>
tsc in apps/web without typegen            RouteContext / LayoutProps missing. Script runs `next typegen` first
Static-only app with localStorage leagues  rejected by the user: needs accounts and cross-device state
Entry-fee prize pools, referral funding    rejected: zero-sum / only pays on new users
```

## Remaining work (commit roadmap)

```text
1. Foundation        DONE except Vercel import
2. Auth              schema, challenge/verify (Cardano first), sessions, /me, sign-in page           (~8)
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
