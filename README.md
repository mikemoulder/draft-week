# FTL: Fantasy Trading League

**Fantasy football for Strike Finance. Pick five real Strike traders, watch their real trades score your points, and when you believe in your squad, copy it on Strike with one signature.**

[**Play it live**](https://strike-ftl.vercel.app) · [How the game works](https://strike-ftl.vercel.app/how-it-works) · [The economics](docs/economics.md)

![Five real Strike traders dealt as cards on the FTL landing page](assets/screenshots/hero.gif)

Built for the Strike Hackathon on Strike's public trading data, its builder codes and its native copy trading.

---

## Why we built it

We didn't want to build another generic trading app. We wanted something innovative, something different: a new way to enjoy trading.

Strike has a fast exchange and a leaderboard, but no reason to care about the *people* on it. Who is the steady scalper who never gets liquidated? Who is the degen who wins on Monday and blows up on Thursday? A PnL table can't tell you, and that is exactly what you need to know before you trust someone with your money.

So we turned Strike's traders into cards. You scout them, pick them, captain them and cheer them on against your friends, for free, every week. And once a week of watching has told you who is actually good, one button turns that conviction into real copy trades on Strike.

## The loop: from a free game to real Strike volume

```mermaid
flowchart LR
    A["Pick five traders<br/>free, within a budget"] --> B["Watch them score<br/>every real fill on Strike"]
    B --> C["Copytrade your squad<br/>Strike's own copy trading"]
    C --> D["Traders earn<br/>Strike's 10% profit share"]
    D --> E["Traders share their cards<br/>followers join next week"]
    E --> A
    C -. "trade on Strike yourself" .-> F["Bigger budget next league<br/>up to +50 credits"]
    F --> A
```

**Copy trading is the bridge.** Fantasy games usually end at a leaderboard. FTL ends at a trade. After a week of watching, the panel at the top of your results says *"Believe in your five? Copy them on Strike."* One wallet signature later, their next trades open in your own Strike account, scaled to the amount you set aside, with a stop-loss per trader. Every one of those copies is real volume on Strike, and every winning copy pays the trader Strike's 10% profit share. That gives Strike's best traders a reason to bring their followers to FTL.

**Your own trading counts too.** Sign in with the wallet you trade with, and your last seven days of Strike volume add credits to your budget: $1k gets +10, up to $250k for +50. The game rewards people for trading on Strike, not just for watching.

FTL charges nothing for any of this. Copies are set up with a 0% builder fee. [docs/economics.md](docs/economics.md) covers how FTL can earn later without making players pay to play.

## What it looks like

| Pick a squad within budget | Watch the week play out | Copy your squad on Strike |
|---|---|---|
| ![Squad builder with a pitch and a graded trader list](assets/screenshots/squad.png) | ![Results with the copytrade banner and a day-by-day matchup](assets/screenshots/results.png) | ![The copytrade panel with amounts, stop-loss and balance](assets/screenshots/copytrade.png) |

## Built on Strike

| Strike capability | What FTL does with it | Where |
|---|---|---|
| Stats leaderboard `/stat/v1/stats/leaderboard` | Discovers active traders every hour, and reads a player's 7-day volume for the trading bonus | [`apps/api/src/strike.ts`](apps/api/src/strike.ts), [`ingest/discover.ts`](apps/api/src/domain/ingest/discover.ts) |
| Fill history `/v2/history/fill` | Pulls every fill of every followed trader every 5 minutes and turns it into daily points | [`apps/api/src/domain/ingest/`](apps/api/src/domain/ingest/) |
| Accounts `/v2/account` | Links a signed-in wallet to its Strike account; shows the available balance before copying | [`auth/service.ts`](apps/api/src/domain/auth/service.ts), [`strike-copy.ts`](apps/web/lib/strike-copy.ts) |
| Builder connect `/auth/builder/*` | One wallet signature connects a player to FTL's builder code `FTL` on mainnet | [`apps/web/lib/strike-copy.ts`](apps/web/lib/strike-copy.ts) |
| Copy trading `/v2/copy/*` | Starts a copy per picked trader, lists running copies with live PnL, stops them from the profile page, reads live minimums | [`apps/web/lib/strike-copy.ts`](apps/web/lib/strike-copy.ts), [`back-squad.tsx`](apps/web/components/game/back-squad.tsx) |
| Trader avatars | Traders who uploaded a picture to Strike see it on their card | [`ingest/discover.ts`](apps/api/src/domain/ingest/discover.ts) |

**How the copy trading works.** Builder connect turns "I like these five" into "I'm copying these five" with one signature from the player's own Cardano, Ethereum or Solana wallet. The signing key is created in the browser as non-extractable and never leaves the tab, so FTL's servers never hold a key that can trade. Each copy runs on Strike's own engine, with the amount set aside as its margin cap and an optional stop-loss. The full walkthrough, every endpoint and what we learned are in [docs/integrations.md](docs/integrations.md).

## How it works

```mermaid
flowchart LR
    U["Player's browser<br/>strike-ftl.vercel.app"] -->|"/api proxy"| W["apps/web<br/>Next.js on Vercel"]
    W -->|"shared secret"| A["apps/api<br/>Hono API"]
    A --> D[("Postgres")]
    I["Ingest worker<br/>apps/api/src/worker.ts"] --> D
    I -->|"public REST"| S["Strike API"]
    U -->|"signed in the tab:<br/>builder connect, copy trading"| S
```

- **Points.** Each day, every Strike trader who traded is ranked by return (realized profit after fees, over their equity). The top tenth scores 10, the bottom tenth 1. A liquidation costs 5, your captain counts 1.5 times, and an idle starter is swapped for a bench trader who traded. [The full rules](https://strike-ftl.vercel.app/how-it-works), including how the game resists gaming.
- **Leagues.** 8 to 500 managers. Opponents are drawn at random at kick-off; bots only make up the numbers. Pick next week and watch it live, or replay a finished week straight away.
- **Fair by design.** Squads lock before the week starts, the week in progress can't be picked, and nobody can pick their own Strike account.

## Technical highlights

- **Scoring built for close games.** We tested scoring on a real Strike week before building it. Raw returns gave 13% close matchups, because one liquidation decided most games on day one. Daily rank scoring gave 50%. ([`scoring/points.ts`](apps/api/src/domain/scoring/points.ts))
- **Wallet sign-in on three chains, verified server-side.** CIP-30 data signatures for Cardano, EIP-191 for Ethereum and ed25519 for Solana, with single-use challenges and hashed sessions. ([`auth/verify.ts`](apps/api/src/domain/auth/verify.ts))
- **Ready for events.** A 300-manager league plays with no bots, 150 matchups, and loads in about 50 ms.

## Run it yourself

Needs Node 22 and Docker.

```bash
git clone https://github.com/mikemoulder/draft-week ftl && cd ftl
cp .env.example .env          # set POSTGRES_PASSWORD, PROXY_SECRET and WEB_ORIGIN=http://localhost:3000
docker compose up -d --build  # Postgres, the API on :3940 (migrates on start) and the ingest worker
npm install
API_ORIGIN=http://127.0.0.1:3940 PROXY_SECRET=<same value as .env> npm run dev:web   # http://localhost:3000
```

The first ingest takes a few minutes; until it lands, the landing page shows a recorded week. To run the 71 API tests against a throwaway database:

```bash
docker run -d --rm --name ftl-testdb -e POSTGRES_PASSWORD=test -p 127.0.0.1:5441:5432 postgres:16-alpine
TEST_DATABASE_URL=postgres://postgres:test@127.0.0.1:5441/postgres npm test -w apps/api
```

## What is real, what is not

- **Real:** every trader, fill, point, avatar and liquidation comes from Strike mainnet. 558 traders followed, 151,838 fills ingested. Wallet sign-in checks real signatures. Builder code `FTL` is registered and live on mainnet, and copy trading calls Strike mainnet.
- **Not yet run:** a full copy with real funds, which needs a funded wallet. The flow is tested up to Strike's builder connect step, with live balance and minimum checks.
- **Recorded:** if the API is unreachable, the landing page falls back to a recorded week.
- **Bots:** they appear only to bring a league up to 8 players or to give an odd manager out an opponent.

## Next

1. A weekly STRIKE prize pot for the top of each table, seeded by Strike or a sponsor.
2. "Trade like this card": one tap to open the same position as a picked trader, with a small builder fee that funds the pot.
3. An FTL vault on Strike that trades the week's most-picked squad.

---

FTL uses Strike Finance's public API and is not affiliated with Strike Finance. Built for the Strike Hackathon, October 2026.
