# Feedback round 1: manual test notes, 2026-10-23

**Status: all items done and deployed (web c22def3, API 9494b41).** Verification is recorded in .hack/handoff.md.

The user played the live site end to end and wrote ten notes. Each one maps to a work item below. Items are
done in phase order; every item ends with its verification and a commit.

## The notes, as written

```text
 1. Strike is multi-account (Cardano, Ethereum, Solana), so we can't default to Cardano. What option can we
    give users before they connect a wallet, so the right account loads?
 2. We need a logo.
 3. Animations on the page.
 4. Animations on each card.
 5. Explain the scoring system: there are ways people might try to game it.
 6. League join is not working (invite code).
 7. "We didn't want to create another generic application. We wanted something innovative, something
    different, a new way to enjoy trading, and that is why we built FTL."
 8. The current week's league is missing.
 9. A profile dashboard: stats, the traders they copy with a stop button, the leagues they played.
10. The league page is unclear: who am I facing, who faced who, how were opponents assigned?
```

## Phase 1: fix what is broken

### F1. Joining a league fails every time (note 6)

- Found: `r.use("/leagues/:id/*")` in `apps/api/src/routes/leagues.ts` also matches `/leagues/join`. "join" is not a
  UUID, so the guard answers 404 "league not found" before the join handler runs. Reproduced on production with
  two guests. Service tests passed because they call the service, not HTTP.
- Change: guard only the routes that take an id. Add an HTTP test: create, join by code, both see each other.
- Also: the invite code is hidden on replay leagues, so a friend can never be invited to one. Show it on every
  league that is still picking.
- Verify: the HTTP test, then the same two-guest check against production.

### F2. Choose the network before the wallet (note 1)

- Found: the sign-in page lists every wallet for every chain at once. OKX shows up under Cardano and Ethereum,
  and nothing says which network the Strike account is on, so it is easy to load the wrong account.
- Change: sign-in becomes two steps. Step 1, "Where is your Strike account?": Cardano, Ethereum, Solana, with
  how many wallets were found for each. Step 2, the wallets for that network. If the wallet has no Strike account
  on that network, the next screen offers "Try another network" before "Create a Strike account".
- Back your squad uses the network the player signed in with, so it inherits this.
- Verify: browser test with fake Cardano, Ethereum and Solana wallets.

## Phase 2: make the game legible

### C1. Fair pairings and a visible fixture list (note 10)

- Found: pairs are seat 1 vs 8, 2 vs 7 by join order, so the owner always meets seat 8 (usually a bot) and two
  friends in one league never meet.
- Change: at kick-off, managers are paired in join order, 1st vs 2nd, 3rd vs 4th; bots take the remaining
  seats and meet each other or the odd manager out. One rule, easy to say.
- League page: a "Matchups" panel in every state. While picking it shows the draw so far and says it is final
  at kick-off; after kick-off it shows every pairing with scores, and the header says "You vs <name>".
  A one-line "How matchups work" note next to it.
- Standings gain a W/L/D column so the head-to-head result and the points table read together.
- Verify: rules unit tests (2, 3 and 8 humans), browser screenshots.

### C2. How it works, and why it is hard to game (note 5)

- New page `/how-it-works`: budget and prices, grades, the trading bonus, daily rank points, liquidation,
  captain, bench and auto-subs, matchups and standings, then "Fair play":
  - picks lock before the week starts, and the week in progress cannot be picked (no hindsight)
  - points come from rank, capped at 10 a day, so one huge lucky trade is worth the same as a solid day
  - returns use an equity floor, so a tiny account cannot post a giant percentage
  - only active people are draftable (5 to 3,000 trades a week), which keeps bots and dormant accounts out
  - you cannot pick your own Strike account (enforced by the API and shown in the list)
  - every point is a real trade on Strike and can be checked there
- Linked from the nav, the landing scoring section, the squad builder and the results page.
- Verify: API test for the self-pick rule, page screenshot at 1440 and 390.

### C3. The week in progress (note 8)

- Found: the current week is excluded on purpose (no hindsight picks), but the page just leaves it out.
- Change: the week list shows the current week, locked, with the reason and what to do instead (replay last
  week now, or pick for next week, which opens Monday).
- Verify: screenshot of the create form.

## Phase 3: the profile

### P1. Profile data (note 9)

- API: `GET /me/history` returns every league the player is in with week, status, rank, points, opponent,
  result and captain, plus totals: leagues, wins, losses, draws, points, best finish, most-picked trader.
- Verify: API test.

### P2. Profile page (note 9)

- `/profile`: stats row, league history (links to each league), and "Copying on Strike": every active copy
  with its PnL from Strike, and a Stop button. Stop is a signed `DELETE /v2/copy/subscribe/{id}`; if this tab has
  no key yet, the wallet signs once (same flow as Back your squad).
- Nav: the player's name links to the profile.
- Verify: browser test with a faked session for the read side; the Stop path is the user's real-wallet test.

## Phase 4: brand and feel

### B1. Logo (note 2)

- An FTL mark that works at 16 px: drawn in SVG from the card and crest language, in the action orange.
  Used in the nav, favicon, apple icon, and an og:image generated with `next/og`.

### B2. Page motion (note 3)

- Hero hand deals in, card by card; sections reveal once on scroll; numbers count up; the matchup scoreboard
  already animates. Reduced motion gets the final state. `transform` and `opacity` only.

### B3. Card motion (note 4)

- Cards tilt toward the pointer with a moving shine, lift on hover, and pop into the pitch when picked.
  Legend cards keep a slow foil sweep. Touch devices get the lift without the tilt.

### B4. Why we built FTL (note 7)

- A short section on the landing page, and the same words open the README.

## Phase 5: ship

- Tests, typecheck, lint, build; the guest E2E plus the new browser checks on a local production build.
- Deploy web and API; check production once from outside; delete every test user.
- Update the handoff, memory and DESIGN.md.
