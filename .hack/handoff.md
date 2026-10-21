# Handoff

**As of:** first commit (`chore: initialize project workflow`) · Wed 2026-10-21 ~19:15 UTC · setup session

## Next step

Scaffold the npm workspaces: `apps/web` (create-next-app, App Router, TypeScript, Tailwind),
`apps/api` (Hono on Node + Drizzle + Vitest), `packages/shared` (zod). Add root scripts `typecheck`,
`test`, `build`. Then `apps/api` `/health` route and `docker-compose.yml` (db + api) so the API answers on
127.0.0.1:3940.

## Current status

**Working:** nothing runs yet. Planning, recon and spikes are done.
**Deployed:** nothing. Web on Vercel not imported; API host waiting on Caddy.
**Build:** n/a (no code yet)

## Verified

```text
Ran:     .hack/recon/spike/cardano_signin_spike.cjs (node 22)
Result:  5/5 pass: real wallet vector accepted; own addr1 signature accepted; tampered message,
         wrong address and forged key all rejected. ~9 ms per verify
Ran:     .hack/recon/spike/fantasy_check.py, replay_spike.py (python 3.12) on the week to 2026-10-21
Result:  182 draftable traders, 32,409 fills, 47 liquidations. Rank scoring: 50% close games.
         Realistic drafts: game of the week median 3 lead changes, 2% margin, 76% with a liquidation
```

## Blocked on the user

```text
Caddy block for draftweek-api.duckdns.org   not in /etc/caddy/Caddyfile yet (DNS already resolves to the VPS)
Vercel                                      import the GitHub repo, root directory apps/web, set API_ORIGIN + PROXY_SECRET
Builder code (optional)                     app.strikefinance.org/builder-codes, only for "trade with my captain"
```

## Do not repeat

```text
GET /v2/exchangeInfo                       404. Market data lives under /price/v2/*
Python urllib default User-Agent           Cloudflare 403 "error code: 1010"
JSON.parse on a /ws/price frame            frames hold several newline-separated messages
Static-only app with localStorage leagues  rejected by the user: needs accounts and cross-device state
Entry-fee prize pools, referral funding    rejected: zero-sum / only pays on new users
```

## Remaining work (commit roadmap)

```text
1. Foundation        workspaces, shared types, compose + /health, Vercel rewrite, first deploys      (~6 commits)
2. Auth              challenge/verify per chain (Cardano first), sessions, /me, sign-in page          (~8)
3. Data              schema + migrations, ingest worker, trader_days, scoring + tests, backfill       (~10)
4. Leagues           create/join, draft turns + bots, lineup, league state endpoint + tests           (~10)
5. UI                dashboard, draft room, lineup, matchup replay (the aha), trader page             (~12)
6. Hardening         states, mobile, README, demo video, make repo public, submit                    (~6)
Cut order if late:   trade with captain -> live leagues -> Solana/Ethereum sign-in -> friends drafting
```

## Context the next person needs

- The repo is private until submission; it must be public before submitting.
- Deadline time zone is unconfirmed (10:00 "EST"). Plan assumes 14:00 UTC and submits by 12:00 UTC.
- VPS docker access works through `sg docker -c "..."` until the next login picks up the group.
