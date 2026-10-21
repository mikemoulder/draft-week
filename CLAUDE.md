# Draft Week

Fantasy league for Strike Finance: players draft real Strike traders, and those traders' real trades score the points.

Hackathon: Strike Hackathon, deadline Fri 2026-10-23 10:00 Eastern (14:00 UTC if EDT, unconfirmed).
Feature freeze Fri 10:30 UTC. Submit by 12:00 UTC.

## Before starting work

Read `.hack/handoff.md` first, then verify it against the repo (`git log --oneline -5`,
`git status --porcelain`). The repository is right when they disagree. `.hack/memory.md` has the
durable project knowledge, and `.hack/plan/architecture-brief.md` is the design. Do not rediscover
what is written there.

## Layout

```text
apps/web          Next.js App Router, deployed on Vercel (root directory apps/web)
apps/api          Hono API + ingest worker + Drizzle schema, deployed with docker compose on the VPS
packages/shared   zod schemas and types used by both apps
.hack/            handoff, memory, plan, recon (committed)
```

## Commands

```bash
npm install                      # workspaces
npm run dev -w apps/web          # web on :3000, proxies /api to API_ORIGIN
npm run dev -w apps/api          # api on :3940
npm run typecheck                # all workspaces, cheapest useful check
npm test                         # vitest
npm run build                    # must pass before any commit
npm run db:migrate -w apps/api   # apply committed migrations
```

Deploy:
- Web: push to `main`, Vercel builds `apps/web`. URL: https://draft-week.vercel.app.
- API: push to `main`, then on the VPS `cd ~/deploy/draft-week && bash deploy/deploy-api.sh` (pulls, rebuilds,
  waits for /health, prunes images). Production runs from that separate clone, never from the dev checkout.
  Secrets: `~/deploy/draft-week/.env` (chmod 600). URL: https://draftweek-api.duckdns.org/health

## The demo path

These files are what gets judged. Changes here are verified in a browser, not just by a green build:

```text
apps/web/app/(auth)/            sign in with a wallet
apps/web/app/leagues/           create, join, draft room, lineup
apps/web/app/leagues/[id]/matchup   THE AHA: replay of a real week
apps/api/src/domain/scoring/    day points, auto-sub, matchups, events
apps/api/src/domain/auth/       per-chain signature verification, sessions
apps/api/src/domain/ingest/     Strike data into Postgres
```

## Project rules

- Strike is called only from `apps/api/src/strike.ts`. Base paths: trading `/v2`, market data `/price/v2`,
  stats `/stat/v1`. Always send a User-Agent (Cloudflare blocks default library agents).
- The browser only talks to the web origin. Never call the VPS hostname from client code.
- No database access from `apps/web`. All data goes through the API.
- We never store a key that can trade. Strike API wallet keys stay on the device that created them.
- Shared types change only in `packages/shared`, and a change there is announced in the handoff.

## Working stance

- **Inspect before modifying.** Find the file, understand what it does, check who calls it, then make
  the smallest change that works.
- **Preserve what works.** Ugly and running beats clean and broken.
- **Verify before reporting.** Typecheck, then a targeted test, then the build, then the demo path in a
  browser. Never say a change works without having checked.
- **One change at a time when debugging.** Stop after two failed attempts and record it under
  Do Not Repeat in the handoff.
- **Protect the scope.** New ideas are classified MUST / SHOULD / COULD / NOT NOW before any code.
  The cut list in the architecture brief is decided.

## Communication

Plain language. The user is not reading the code.

```text
Found:    what was wrong or what was learned
Changed:  what was done
Verified: how it was checked
Next:     the next step
```

## Before ending a session

Verify, commit, then update `.hack/handoff.md` with the exact stopping point and the single next step.
Update `.hack/memory.md` only when something durable changed.

## Never

- Commit a secret or a `.env` file. `NEXT_PUBLIC_*` ships to the browser.
- Add AI attribution to a commit: no `Co-Authored-By` naming a tool, no generated-by footer, no robot
  emoji. Judges browse commit history.
- Use em dashes in the README, docs, commit messages or comments.
- Push to `main` with a red build.
- Touch anything on the VPS outside the `draftweek` compose project and its one Caddy block.
- Refactor after hour 20.
