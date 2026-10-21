# Recon brief: Strike Hackathon (Strike Finance, first edition)

**Researched:** 2026-10-21 · **Deadline:** Fri 2026-10-23, 10:00 "EST" · **Time on the clock:** about 47 hours from 15:00 UTC Wed

## The one thing that matters

Strike's whole exchange is readable without a key: every account's balance, positions and
fills by wallet address, every open position on the venue, and every individual resting order
(L3). That means a project can run on real mainnet data from minute one, and it only needs the
wallet signing flow if it has to trade.

## Decide these first

| Question | Answer | Basis |
|---|---|---|
| Which tracks? | There are none. One pool, top 3 win | Announcement: "no predefined tracks" |
| Which technologies to learn? | 1. Strike public data (REST + WS + L3). 2. Builder Codes (wallet connect, signed trading) | Both spiked below |
| Skipping, and why? | **Strike Node** (the docs link the user saved): not open source, roadmap only, nothing to call. **Cardano locker contracts** (`perpetuals-smart-contracts`, Aiken): custody only, 47h is too short. **STRIKE token / staking**: no API surface found | Decisions, not omissions |
| Blocking unknown? | Get a builder code or API wallet registered **today** if the idea trades. Testnet funding path is unknown | See "Could not verify" |

## The hackathon

```text
CONFIRMED   Build: Wed Oct 21 10:00 EST -> submit Fri Oct 23 10:00 EST. Winners Mon Oct 26.
            Prizes: 6,000 STRIKE total. 1st 3,000 / 2nd 2,000 / 3rd 1,000 STRIKE.
            No tracks. Solo or team. Existing projects OK if they add meaningful new functionality.
            Must: build on Strike "in a meaningful way"; working prototype; docs explaining how
            it interacts with Strike; video or live demo; GitHub repo.
            Judging (5 criteria, no weights): Innovation and Creativity, Integration With
            Strike, Utility and Impact, Technical Execution, Future Potential.
            Possible direct investment from Strike and partners for strong projects.
            Their example ideas: dashboards, bots, MM tools, social/copy trading, analytics.

INFERRED    The "$3,000" in the title means STRIKE is about $0.50. Prizes are paid in token, not USD.
            "Future Potential" plus builder codes (you earn fees) favours something that could
            become a real product on Strike.
            Read-only projects probably qualify ("use ... functionality ... or ecosystem").

UNKNOWN     Submission form ("Coming soon"). Judge panel ("announced soon"). Criteria weights.
            Whether "10:00 EST" means EDT (14:00 UTC) or literal EST (15:00 UTC).
```

**Judging weights:** none published. Treat the five criteria as equal and assume an engineer on the
panel will check "Integration With Strike".

## The technologies

### 1. Strike public market + account data

**What it is.** A Binance-shaped REST and WebSocket API for a perps exchange with 31 markets.
Besides crypto it lists stocks and commodities (NVDA, TSLA, SP500, NAS100, XAU, WTI, SKHYNIX,
MU and others). Everything below is public, with no key.

**Why it exists.** Bots, dashboards and copy traders need the data, and Strike wants volume.

**What it replaces.**

```text
BEFORE  To see what other traders on a venue hold, you scrape a UI or index a chain, and most
        CEXes never expose it at all.
AFTER   GET /v2/positions?blockchain_address=<addr> returns that wallet's live positions, and
        /stat/v1/stats/live-positions returns every open position on the venue with wallet and
        ADA handle. No auth.
So      Whole-exchange analytics, trader profiling and risk views run on real mainnet data
        with zero onboarding.
```

**You can:**
- Market data at `/price/v2/*`: depth, trades, klines (Binance array format), mark/index/funding, OI, 24h ticker
- Stats at `/stat/v1/*`: leaderboard (PnL, ROI, Sharpe, drawdown), liquidation map, OI/funding/basis/spread/long-short history, daily platform stats, revenue, treasury
- **Cross-venue funding comparison**: Strike vs Binance, Bybit, OKX, Hyperliquid, Lighter and others, per symbol
- **Any account** by `blockchain_address`, `account_id` or `vault_id`: account, positions, fill history
- **L3 order-by-order book**: `/v2/l3/snapshot` + `wss://.../ws/l3` (individual order ids, FIFO queue)
- Copy-trading discovery, including Hyperliquid wallets with 30-day equity curves; vault list and portfolio

**You cannot:**
- Get much liquidity. BTC did about 36 BTC (~$3M) in 24h, top of book was ~0.018 BTC, and no BTC trade printed in a 12 s window
- Use testnet for a live-looking demo. Its BTC book had no asks and the last trade was days old
- Run or verify the Strike node. It is closed source and "run your own node" is roadmap only

**Costs you:** nothing. Remember the `/price` and `/stat` prefixes, and send a User-Agent.

**Spike result:** ran after a fight (three undocumented gotchas). See `spike-log.md`.

### 2. Builder Codes (signed trading on behalf of users)

**What it is.** A way for a third-party app to onboard a user with one wallet signature
(Ethereum, Solana or Cardano) and then trade, deposit and withdraw for them through an
Ed25519 "API wallet" your app holds. Your app earns up to 100 bps on every fill.

**Why it exists.** Strike wants other front ends and bots routing volume to its book, and pays them for it.

**What it replaces.**

```text
BEFORE  Users go to Strike's app, create keys and paste them into your tool. You earn nothing.
AFTER   POST /auth/builder/request-signature -> user signs in Phantom/Rabby/Nami ->
        verify-signature returns an API wallet. Orders carry X-Builder-Fee-Bps: N.
So      An app on Strike can be a business from day one: onboarding is one signature, and
        revenue arrives on every fill.
```

**You can:**
- Create accounts for new users automatically (no prior Strike account needed)
- Place market/limit/stop/TP-SL/bracket/batch/replace orders, set leverage and margin mode
- Run TWAP and grid bots server-side, start or stop copy subscriptions, trade on a vault with `vault_id`
- Read the private user stream on `wss://.../ws/user-api` (session.logon)
- Deposit and withdraw via server-built unsigned transactions ($5 minimum, $1 withdrawal fee)

**You cannot:**
- Withdraw with the API wallet alone. Every withdrawal needs the user's own wallet signature
- Connect without a **registered builder code**. A fake one returns `404 builder code not found` (observed)
- Charge more than 100 bps, or more than the user approved at connect

**Costs you:** registering at app.strikefinance.org/builder-codes with a wallet. Whether that is
instant is unknown. For your own bot, the API Wallets page is the simpler route.

**Spike result:** the reference app builds clean (`npm ci && npm run build`, 14 s). The signed path is
**blocked on a key**: the connect challenge works up to code validation.

## How it fits together

```text
user wallet (ETH / SOL / ADA)  --one signature-->  /auth/builder/*  -->  API wallet (Ed25519, held by your app)
your app  --signed REST (+X-Builder-Fee-Bps)-->  api.strikefinance.org/v2/*  -->  Strike node (matching, margin, liquidations)
your app  <--public REST /price /stat, WS /ws/price, /ws/l3--  Strike node state
Strike node  -->  on-chain locker contracts (Cardano + EVM + Solana) for custody and settlement
```

## Vocabulary

| Term | Means | Why it matters |
|---|---|---|
| API wallet | Ed25519 keypair registered to an account. Signs `METHOD:PATH:TS:NONCE:sha256(body)` | All auth. It can trade but never withdraw |
| Builder code | Your registered app id plus a fee cap | Needed for user onboarding and fee revenue |
| L3 | Book at single-order level, with ids and FIFO order | Rare on DEXes. About 460 msgs/s on BTC+ETH |
| Mark / index price | Fair price used for PnL and liquidation / spot reference | Liquidations key off mark, not last |
| Vault | Pooled account run by a leader. Trade it by adding `vault_id` | A strategy can take deposits |
| Copy trading | Mirror a Strike *or Hyperliquid* wallet | Cross-venue already exists |
| Strike node | Closed off-chain matching engine; Cardano holds custody | Nothing to build against yet |

## Already saturated

```text
Perps dashboard / activity tracker            Hizz already ships one
Copy-trading assistant / "find good traders"  Strike Copilot (Claude), Bolt, the official Hermes skill, Strike's own discover page
Grid / TWAP / trailing-stop bots              Strike ships all three natively, as UI and API
Generic market-making bot                     the Hummingbot fork has a strike_perpetual connector
"AI agent that trades on Strike"              official agent skills for Claude Code and Hermes already exist
A trading terminal clone                      strike-builder-reference IS that, with TradingView
Leaderboard / liquidation heatmap             /stat already serves both, and Strike runs clan competitions
```

## Where the openings are

```text
Whole-venue transparency: every position, balance and fill is public by address, so any
  account can be analysed, compared or watched without its owner's keys.
L3 is new (only BTC is "enabled", yet ETH streamed too): queue position, order lifetime and
  maker behaviour are observable order by order. Nothing visible uses it yet.
Strike funding diverges from other venues and the API ships the comparison (ADA: Strike 0.146%
  vs Bybit 0.010% at the same hour). Cross-venue basis is a native data feed here.
Builder fees + vault_id: a strategy can onboard users in one signature, earn per fill, and
  run pooled capital. Infrastructure for products, not features.
Traditional assets on a Cardano-native venue: equities and commodities perps, reachable from an
  ADA/SOL/ETH wallet.
Thin book: the gap between quote size and real demand (and RFQ's "Quoter" role) is a liquidity
  problem the venue itself is trying to solve.
```

## Could not verify

```text
Testnet funds                 no faucet documented. Testnet accounts show $5M deposits, so some path exists. ASK
Builder code registration     self-serve or reviewed? how long? Needs a wallet login. Do it today if trading
Mainnet API wallet            whether an unfunded account can create one. Needs the user's wallet
User WS /ws/user-api          not spiked (needs a key)
Order enum casing             docs show both "buy"/"limit" and "BUY"/"LIMIT". Test on first order
Rate-limit weights            2400 weight/min and 1200 orders/min published; weight per endpoint is not
Public account lookup         works today. Intended, or could it close? Building a product on it is a bet. ASK
[ASK ORGANIZERS] Submission form and where to submit ("Coming soon")
[ASK ORGANIZERS] Deadline: 10:00 EDT (14:00 UTC) or 10:00 EST (15:00 UTC)?
[ASK ORGANIZERS] Is a read-only analytics project "meaningful integration", or must it trade?
[ASK ORGANIZERS] Are criteria weighted? Who judges?
```

## Idea parking

```text
- (none raised by the user yet; capture sparks here for /skillz:ideation)
```

## Sources

```text
docs.strikefinance.org/llms.txt (all 92 pages fetched as .md, 2026-10-21)
github.com/strike-finance/strike-builder-reference      commit 2026-10-20 "Sync with strike-v2-backend"
github.com/strike-finance/strike-finance-skills         v0.0.4, 2026-10-20 (OpenAPI yaml inside)
github.com/strike-finance/strike-finance-hermes-skill
medium.com/feed/@strikecardano (announcement, pub 2026-10-18; page itself 403s)
Live calls to api.strikefinance.org and api-v2-testnet.strikefinance.org (spike-log.md)
```

---

**Next:** `/skillz:ideation`, with `hackathon.yml` already filled from this brief.
