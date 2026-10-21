# Handoff

**As of:** `9e97152` · Wed 2026-10-21 ~21:15 UTC · leagues session

## Next step

UI phase with /skillz:frontend. The whole backend for the demo path is live; the web app is still the
placeholder. Screens, in demo order: landing + sign in, dashboard (my leagues, create league for a week),
draft room (pool cards, picks arriving, on the clock), lineup (captain, starters, bench), matchup replay
(THE AHA: scores tick day by day, liquidation flash, auto-sub, lead change), trader page.
Hero screen: the matchup replay.

## Current status

**Working (production, through https://draft-week.vercel.app/api):** sign-in; ingest every 5 min;
weeks + pool; leagues: create, join by invite, start (bots fill seats), snake draft with bot auto-picks,
default lineups, lineup edits, play a replay week, matchups + standings + events.
**Deployed:** web 310cc09 (placeholder UI), API 9e97152.
**Build:** green. 56 API tests.

## Verified

```text
Ran:     TEST_DATABASE_URL=postgres://postgres:test@127.0.0.1:5441/postgres npx vitest run  (apps/api)
Result:  56 passed, three runs in a row (incl. concurrent double-pick -> exactly one succeeds)
Ran:     full replay league on production via the Vercel proxy with a generated Cardano wallet
Result:  draft of 40 picks in 6.8 s; standings 152 / 150.5 / 150 / 134 / 134 / 127 / 113 / 92;
         every matchup had 1-2 lead changes; liquidation and auto-sub events present.
         Test user deleted afterwards (cascade removed its league); prod tables back to 0 rows
Not yet: a real browser wallet extension; any real UI
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
4. Leagues           DONE (15 endpoints total: auth 4, weeks 2, leagues 8, health 1)
5. UI                dashboard, draft room, lineup, matchup replay (the aha), trader page             (~12)
6. Hardening         states, mobile, README, demo video, make repo public, submit                    (~6)
Cut order if late:   trade with captain -> live leagues -> Solana/Ethereum sign-in -> friends drafting
```

## Context the next person needs

- Repo is private until submission; it must be public before submitting.
- Deadline time zone unconfirmed (10:00 "EST"). Plan assumes 14:00 UTC and submits by 12:00 UTC.
- Production backend runs from `~/deploy/draft-week`, not from the dev checkout.
