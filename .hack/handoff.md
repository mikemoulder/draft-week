# Handoff

**As of:** `c22def3` · Fri 2026-10-23 · feedback round 1 (all ten notes done, see .hack/plan/feedback-round-1.md)

## Next step

The user re-tests the live site against their notes, in particular with a real wallet: sign in on the right
network, join a friend's league by code, Back your squad for $20, then stop that copy from /profile. Then: demo
video, judge-facing README (/skillz:readme), make the repo public, submit.

## Current status

**Working (production):** landing (dealt hand, live numbers, game of the week, why we built FTL), /how-it-works
(full rules and fair play), network-first wallet sign-in or guest, create a league (the week in progress shows as
locked), join by invite code, pick a 5 trader squad within a budget from a graded list with a pitch preview,
matchup preview while picking, replay or live results with "your matchup", W/L/D standings, Back your squad
(Strike copy trading, builder code FTL), /profile with stats, league history, most-picked traders and live copies
with a stop button.
**Deployed:** web c22def3 on Vercel at https://strike-ftl.vercel.app, API 9494b41 on the VPS.
**Game model:** FPL style. Traders priced 20-60 by last week's points percentile, graded A+ to D by return.
Picks are not exclusive, but never your own Strike account. 3 starters + 2 bench, captain x1.5, auto subs.
Matchups: managers meet in join order (1st v 2nd), bots take the rest. Economics in docs/economics.md.
**Shared types changed this session:** `standings[].result` (W/L/D), `pairings()` moved into packages/shared,
new `HistoryEntry` and `Profile` (GET /me/history).
**Design:** DESIGN.md v2 plus the FTL mark (a fanned hand of three cards) and the motion set in section 7b.

## Verified

```text
Ran:     API tests, 69 passed (throwaway Postgres on :5441, npm run test:db; vitest --no-file-parallelism)
         incl. an HTTP test that joins a league by invite code (fails on the old routing, passes now)
Ran:     join by code on production with two guests: 200, both members listed. Guests deleted
Ran:     browser checks on a local production build + live API, all with 0 console errors:
         two-step sign-in with fake Cardano/Ethereum/Solana wallets (real Solana signature, no-account screen),
         two guests in one league (preview "You v Guest", result "your matchup: you v Guest"),
         how-it-works at 1440 and 390 (no overflow), the locked current week, profile with a faked Strike session
         (two real copies read from Strike, stop confirmation shown, not sent), hero deal, card tilt,
         reduced motion (final state at once), scroll reveals, and the full guest E2E (16.8 s)
Ran:     web typecheck, eslint, next build -> clean
Ran:     node e2e.mjs http://127.0.0.1:3978 (production build + live API):
         signin -> create -> trader sheet -> affordable filter -> add 5 -> save and play -> results,
         17.3 s, 0 console errors, screenshots at 1440 and 390. Test guests deleted from prod afterwards
Ran:     Back your squad in a real browser (local build, fake builder code, fake Phantom, faked session):
         guest message, live balance + minimum ($20) checks, Ed25519 key made, Strike 404 "builder code not found"
Not yet: a real copy subscription or stop (needs the user's wallet + funds); a real phone
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
drizzle-kit generate with a rename         interactive prompt, no TTY. Split into a drop migration and an add migration
autoSquad / canAdd reserve                 reserve the sum of the cheapest remaining traders, not cheapest x slots
Static-only app with localStorage leagues  rejected by the user: needs accounts and cross-device state
Entry-fee prize pools, referral funding    rejected: zero-sum / only pays on new users
Snake draft with exclusive picks           replaced by the FPL budget model at the user's request
verify-signature with a throwaway wallet   creates a real Strike account on mainnet. Only probe request-signature
Repeated headless runs against Vercel     Vercel Security Checkpoint 403s this VPS. Test on a local build instead
r.use("/leagues/:id/*") in Hono             also matches /leagues/join. Put id guards on the id routes only
Python str.replace with a computed slice  an empty match inserts at every character. Assert the old text first
Passing a function prop to CountUp         breaks prerender from a server component. Use its default format
```

## Remaining work (commit roadmap)

```text
1-5. Foundation, auth (Cardano, Solana, Ethereum), data, leagues, UI     DONE
6. Back your squad: LIVE with builder code FTL. Untested with a real wallet and real funds
7. Feedback round 1: DONE (join fix, network-first sign-in, pairings, how it works, locked week, profile,
   logo + favicon + og:image, motion, why we built FTL)
8. Hardening: README for judges, demo video, repo public, submit
Cut order if late:   copy trading -> live calendar leagues -> Solana/Ethereum sign-in
```

## Context the next person needs

- Repo is private until submission; it must be public before submitting.
- Deadline time zone unconfirmed (10:00 "EST"). Plan assumes 14:00 UTC and submits by 12:00 UTC.
- Production backend runs from `~/deploy/draft-week`, not from the dev checkout. Deploy: `bash deploy/deploy-api.sh`.
- Prod holds the user's own test users and leagues (guests, a Cardano and an Ethereum wallet). Leave them.
