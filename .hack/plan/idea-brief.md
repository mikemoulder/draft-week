# Idea brief: Draft Week

> Working name. Rename at most once, and not today.
> Chosen 2026-10-21 over Domino (liquidation cascade simulator), which stays the runner-up.

## The sentence

> We built **Draft Week** for **Strike traders and their friends**, letting them **draft real Strike
> traders into fantasy teams and score points from those traders' real trades**, using **Strike's public
> per-account trade history** to make **fantasy sports for trading** possible.

## Problem

**Who:** a Strike user in a Discord clan who follows other traders but has no stake in watching them.
**Pain:** trader discovery on Strike is a leaderboard: a static list sorted by PnL. Nothing makes it fun
to follow traders week to week, and nothing turns watching into a reason to come back to Strike and trade.
**Evidence:** Strike's own announcement lists "social trading: leaderboards, trader discovery,
community-driven trading" as a target area, and Strike already runs clan competitions.

## Solution

Players form a league, draft five real Strike traders each, and pick a captain. For a week, those traders'
real fills on Strike score points every day, with penalties when one gets liquidated. Players face one
opponent per week, and a "trade with my captain" button lets them back a pick with their own money on
Strike, which funds the prize pot through a builder fee.

## Why now

Strike publishes every account's fills, positions and liquidations by account and wallet, with readable ADA
handles, and its builder codes (live in 2026) let a third-party app onboard any existing Strike user with one
signature and earn a fee on trades it routes. Fantasy trading needs both.

## Why this technology

| Technology | Used for | Depth | Remove it and… |
|---|---|---|---|
| Strike `/v2/history/fill?account_id=` (public) | every point scored: realized PnL, fees, liquidations (`auto_close_type`) | Essential | there is no game |
| Strike `/stat/v1/stats/leaderboard` (7d / 24h) | the draft pool, trader cards (win rate, Sharpe, drawdown, handle) | Essential | no one to draft |
| Strike `/v2/positions?account_id=` + `wss /ws/price` | live match view: picks' open positions moving with mark price | Valuable | replay only |
| Strike Builder Codes + signed `POST /v2/order` with `X-Builder-Fee-Bps` | "trade with my captain", funding the prize pot | Valuable | free game with no pot |

## The aha moment

**At 0:30 the judge sees:** the draft finishes and "replay match week" plays last week's real trades in
fast-forward. The opponent's captain gets liquidated on Tuesday (-5, red flash), your bench pick takes over,
and you win by 3 points on Sunday. Every number is a real trade by a real Strike trader.

**Why it lands:** instantly understood (fantasy football), visible (scores move), real (mainnet data), and
it has drama (liquidations).

## Demo script

| Time | What you do | What appears | What the system is doing |
|---|---|---|---|
| 0:00 | "Fantasy football, but the players are real Strike traders." | draft board of real traders with cards | leaderboard + fills, styles derived from fills |
| 0:15 | finish the draft against 7 bot managers, pick a captain | your lineup | snake draft |
| 0:30 | hit "Replay last week" | the matchup plays day by day: scores tick, a liquidation flashes, auto-sub, the lead changes | scoring engine over real fills, picking the most dramatic real matchup |
| 1:30 | tap a trader card | their real trades and positions on Strike | public account endpoints |
| 2:00 | "Trade with my captain" | signed order on Strike with builder fee, pot grows | builder-code API wallet (if registered) |
| 2:30 | league table + season pot | standings, pot funded by fees, no entry fee | |

**Fallback:** recorded run at `demo/draft-week.mp4`. "Same replay, recorded an hour ago, real mainnet data."

## Scoring (validated on last week's real data)

```text
Each day, rank every trader who traded by net return: 1 to 10 points by decile.
No trade that day = 0. Liquidation, ADL or bankruptcy = -5. Captain = 1.5x.
Auto-sub: a starter with no trades is replaced by a bench pick who traded.
```

Simulated 8,000 matchups from the week to 2026-10-21 (182 draftable traders, 32,409 fills, 47 liquidations):
50% close games (vs 13% for raw-return scoring, where one liquidation decided the game). 39% have a lead
change with random drafts and daily granularity. Script: `.hack/recon/spike/fantasy_check.py`.

## Reward model

```text
Free to play. No entry fee, so no loser-funds-winner pot and much less gambling risk.
Pot funded by builder fees on trades players route through the app ("trade with my captain").
Works for existing Strike users: builder connect attaches to existing accounts.
Premium leagues: hold N STRIKE (wallet signature check, nothing transferred; liquid staking keeps earning).
Referral codes rejected: they only pay on newly signed-up users.
Early seasons need Strike or a sponsor to seed the pot. At current volume, fees alone are small.
```

## MVP

```text
MUST HAVE       the aha moment cannot happen without these
  - Data job: draft pool (7d leaderboard, bots/vaults filtered) + fills cache per trader
  - Trader cards: handle, 7d PnL, win rate, active days, style tag, liquidations
  - Draft vs 7 bot managers, captain, bench
  - Scoring engine (rank scoring above) + auto-sub
  - Replay match week, choosing the most dramatic real matchup
  - Deployed URL

SHOULD HAVE     only after every MUST is deployed
  - "Trade with my captain": builder connect + signed order with X-Builder-Fee-Bps
  - Season pot panel (fees routed, pot size)
  - Live mode: current week, intraday score updates
  - Multiplayer league by invite link

NICE TO HAVE    only if ahead
  - STRIKE-holder premium leagues (wallet signature check)
  - Hyperliquid traders in the pool (leaderboard platform=hyperliquid)
  - MVP-trader share of the pot

CUT             decided, not revisited at hour 20
  - Paid entry, escrow contracts, real-money pots
  - Referral-code funding
  - Accounts and logins beyond wallet connect
  - Mobile beyond "doesn't break"
```

## Scope check

```text
Build hours available:       ~30
Honest estimate for MUST:    ~7h raw x 2 = ~14h
Ratio:                       ~0.47
Riskiest component:          builder code registration (SHOULD, needs the user's wallet). Start it today in parallel.
                             For MUST: the replay screen has to feel dramatic. Prototype it against the cached week first.
```

## Risks

| Risk | If it happens | Mitigation |
|---|---|---|
| **Technical** | builder code not approved in time | "trade with captain" ships as a deep link to the trader on Strike; pot shown as design |
| **Product** | "a leaderboard with extra steps" | draft + head-to-head + liquidation drama in the first 30 seconds |
| **Demo** | live week is quiet | replay of a chosen real week is the default demo; live mode is extra |
| **Data** | half of traders are inactive on a given day | "active days" on cards, auto-sub, intraday updates |
| **Ethics** | featuring real traders by handle | data is already on Strike's leaderboard; add opt-out; no wallet addresses on cards |

## The hard question

**They will ask:** "Where does the prize money come from, and isn't this gambling?"
**You answer:** "Entry is free, so nobody stakes money on the outcome. The pot is funded by a builder fee on
trades players choose to place through the app, so it can only pay out what the game earned in real Strike
volume. Premium leagues require holding STRIKE, not spending it."

**What is hardcoded:** bot managers' draft logic, scoring parameters, the replay week (a cached snapshot),
the bot/vault filter thresholds (5 to 3,000 trades per week).

## Tracks targeted

| Track / sponsor | Prize | Why we qualify | Integration depth |
|---|---|---|---|
| Strike Hackathon (single pool) | 3,000 / 2,000 / 1,000 STRIKE | built on Strike's public trade data; routes real trades with builder codes; STRIKE holding for premium leagues | rung 3 (data) to 4 (if builder trading ships) |

## Handoff

```text
demo.hero_screen      the matchup replay: two lineups, daily scores ticking, liquidation flash, lead change
Owner per MUST item   (solo assumed) data job -> scoring -> draft -> replay screen -> deploy
Parallel today        user registers a builder code at app.strikefinance.org/builder-codes
Next skill            /skillz:architecture, then /skillz:frontend
```
