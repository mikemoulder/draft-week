# Handoff

**As of:** `79096e1` · Thu 2026-10-22 · squads session

## Next step

The user tries the live site with their OKX wallet (sign-in list, Strike account step, squad builder). Then:
"Back your squad" copy trading (needs a builder code from the user), og:image + favicon, README for judges,
demo video, make the repo public, submit by Fri 12:00 UTC.

## Current status

**Working (production):** landing (real hand, real game of the week), wallet or guest sign-in, a "no Strike
account yet" step, create league, pick a 5 trader squad within a budget (200 credits + Strike volume bonus up to
+50) from a scrollable graded list with a pitch preview and a trader detail sheet, save and play the week, replay
scoreboard, standings, all matchups.
**Deployed:** web 79096e1 on Vercel, API 9fba5f8 on the VPS.
**Game model:** FPL style. Traders priced 20-60 by last week's points percentile, graded A+ to D by return.
Picks are not exclusive. 3 starters + 2 bench, captain x1.5, auto subs. Economics in docs/economics.md.
**Design:** DESIGN.md v2, flat warm plum ground (no background gradients), Bricolage + Figtree, Phosphor icons,
Strike avatars on cards where traders uploaded one (104 of 541), generated crests otherwise.

## Verified

```text
Ran:     API tests, 66 passed (throwaway Postgres on :5441, npm run test:db)
Ran:     web typecheck, eslint, next build -> clean
Ran:     node e2e.mjs http://127.0.0.1:3978 (production build + live API):
         signin -> create -> trader sheet -> affordable filter -> add 5 -> save and play -> results,
         17.3 s, 0 console errors, screenshots at 1440 and 390. Test guests deleted from prod afterwards
Not yet: a real browser wallet extension (OKX on Ethereum especially); og:image; a real phone
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
```

## Remaining work (commit roadmap)

```text
1-5. Foundation, auth (Cardano, Solana, Ethereum), data, leagues, UI     DONE
6. Back your squad: copy the picked traders via /v2/copy/subscribe        needs builder code
7. Hardening: og:image, favicon, README, demo video, repo public, submit
Cut order if late:   copy trading -> live calendar leagues -> Solana/Ethereum sign-in
```

## Context the next person needs

- Repo is private until submission; it must be public before submitting.
- Deadline time zone unconfirmed (10:00 "EST"). Plan assumes 14:00 UTC and submits by 12:00 UTC.
- Production backend runs from `~/deploy/draft-week`, not from the dev checkout. Deploy: `bash deploy/deploy-api.sh`.
- Prod holds two leagues by the user ("rex league", "rexxie"), made before the squad model. Leave them.
