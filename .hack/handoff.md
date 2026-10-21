# Handoff

**As of:** `ae4233e` · Thu 2026-10-22 ~01:00 UTC · UI session

## Next step

Critique pass on the live site (https://draft-week.vercel.app) with the user: they asked for warm, creative, real
icons, and rejected background gradients. Then: og:image + favicon (next/og from the hero hand), README for judges,
demo video, make the repo public, submit by Fri 12:00 UTC.

## Current status

**Working (production):** the whole game in a real browser: landing (real hand of cards, real game of the week),
guest or wallet sign-in, create league, start draft, 5 picks vs bots, lineup (swap + captain), play the week,
replay scoreboard, standings, all matchups. Zero console errors in the run.
**Deployed:** web ae4233e on Vercel, API b1cb1ec on the VPS.
**Design:** DESIGN.md v2, "floodlit card club" without the floodlights: flat warm plum ground, Bricolage + Figtree,
trader cards with generated crests, ratings and tiers, Phosphor icons. Name: FTL, Fantasy Trading League.

## Verified

```text
Ran:     API tests, 60 passed (throwaway Postgres on :5441)
Ran:     web typecheck, eslint, next build -> clean
Ran:     node scripts/e2e-guest-flow.mjs http://127.0.0.1:3978 (production build + live API):
         signin -> create -> draft x5 -> lineup -> play -> results,
         19 s, 0 console errors, screenshots at 1440 and 390. Test guests deleted from prod afterwards
Not yet: a real browser wallet extension; og:image; a phone with a real touch screen
```

## Do not repeat

```text
GET /v2/exchangeInfo                       404. Market data lives under /price/v2/*
Python urllib default User-Agent           Cloudflare 403 "error code: 1010"
JSON.parse on a /ws/price frame            frames hold several newline-separated messages
`docker compose` with the system install   not available (compose v1 only). Plugin is in ~/.docker/cli-plugins
pkill/pgrep -f "<pattern>" in a command   matches its own shell and kills it. Find the pid by port: ss -ltnp | grep :PORT
next dev after big CSS edits              can serve stale CSS. Restart it, or check with next build
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
5. UI                DONE: landing, signin, play, league (setup/draft/lineup/results). Trader page cut
6. Hardening         states, mobile, README, demo video, make repo public, submit                    (~6)
Cut order if late:   trade with captain -> live leagues -> Solana/Ethereum sign-in -> friends drafting
```

## Context the next person needs

- Repo is private until submission; it must be public before submitting.
- Deadline time zone unconfirmed (10:00 "EST"). Plan assumes 14:00 UTC and submits by 12:00 UTC.
- Production backend runs from `~/deploy/draft-week`, not from the dev checkout.
