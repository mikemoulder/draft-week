# Handoff

**As of:** `4812a76` · Wed 2026-10-21 ~20:40 UTC · data session

## Next step

Leagues phase. Schema: leagues, league_members, picks, lineups (+ migration `leagues`). Domain in
`apps/api/src/domain/leagues/`: create (8 seats, owner seat 0, bots fill on start), join by invite code,
snake draft turn order, bot auto-pick (best available by prev-week points with jitter, prefer active),
lineup rules (3 starters, 2 bench, captain is a starter), and league state with matchups + standings from
trader_days (captain x1.5, auto-sub). Routes per the architecture brief. Tests against the throwaway db.

## Current status

**Working (production):** sign-in; ingest every 5 min (540 traders, ~139k fills, weeks 2026-10-05..19);
`GET /api/weeks` and `GET /api/weeks/:id/pool` (227 draftable for the replay week 2026-10-12).
**Deployed:** web https://draft-week.vercel.app (310cc09), API 4812a76.
**Build:** green. 41 API tests.

## Verified

```text
Ran:     TEST_DATABASE_URL=postgres://postgres:test@127.0.0.1:5441/postgres npx vitest run  (apps/api)
Result:  41 passed (sign-in 19, scoring 7, ingest 7, pool 3, app 5), three runs in a row
Ran:     first production ingest: 540 traders, 138,615 fills, 0 errors, 226 s; incremental runs ~18 s
Checked: replay week 2026-10-12 has 197 traders with 5..3000 trades, 95 liquidations, points spread evenly 1..10
Checked: https://draft-week.vercel.app/api/weeks and /api/weeks/2026-10-12/pool return real data; bad week id -> 400
Not yet: a real browser wallet extension
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
3. Data              DONE (ingest worker, scoring, pool, weeks)
4. Leagues           create/join, draft turns + bots, lineup, league state + tests                    (~10)
5. UI                dashboard, draft room, lineup, matchup replay (the aha), trader page             (~12)
6. Hardening         states, mobile, README, demo video, make repo public, submit                    (~6)
Cut order if late:   trade with captain -> live leagues -> Solana/Ethereum sign-in -> friends drafting
```

## Context the next person needs

- Repo is private until submission; it must be public before submitting.
- Deadline time zone unconfirmed (10:00 "EST"). Plan assumes 14:00 UTC and submits by 12:00 UTC.
- Production backend runs from `~/deploy/draft-week`, not from the dev checkout.
