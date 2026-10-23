# How FTL uses Strike

FTL is built on three parts of Strike: its public trading data, builder codes, and native copy trading. All Strike
calls from the server go through one client, [`apps/api/src/strike.ts`](../apps/api/src/strike.ts). Copy trading is
the one exception, and it runs in the browser on purpose (see below).

## 1. Public data: turning fills into a game

| Call | Used for | Where |
|---|---|---|
| `GET /stat/v1/stats/leaderboard` (30d, by trades) | Discovers active traders every hour. Vaults and accounts with no trades are skipped | [`ingest/discover.ts`](../apps/api/src/domain/ingest/discover.ts) |
| `GET /stat/v1/stats/leaderboard?addresses=` (7d) | A player's own 7-day volume, which sets their trading bonus (+10 to +50 credits) | [`leagues/service.ts`](../apps/api/src/domain/leagues/service.ts) |
| `GET /v2/history/fill` | Every fill of every followed trader, pulled incrementally every 5 minutes | [`apps/api/src/domain/ingest/`](../apps/api/src/domain/ingest/) |
| `GET /v2/account?blockchain_address=` | Links a signed-in wallet to its Strike account. A 404 means "no account yet", and the sign-in page offers Strike's sign-up | [`auth/service.ts`](../apps/api/src/domain/auth/service.ts) |
| Avatars on `prod-images.strikefinance.org` | Traders who uploaded a picture see it on their card. Only that host is accepted | [`ingest/discover.ts`](../apps/api/src/domain/ingest/discover.ts) |

Fills become daily rows per trader (realized PnL after fees, trades, liquidations, equity going into the day), and
those become points: each day, everyone who traded is ranked by return and scored 1 to 10 by tenth, with a 5 point
liquidation penalty ([`scoring/points.ts`](../apps/api/src/domain/scoring/points.ts)). Points are recomputed after
every ingest, so a trade on Strike shows up in FTL within minutes.

Things we learned the hard way, recorded so the next builder does not repeat them:

- Cloudflare in front of the API rejects default library user agents (`error code: 1010`). Always send a User-Agent.
- Market data lives under `/price/v2`, trading and accounts under `/v2`, stats under `/stat/v1`.
- `/v2/account` lookups by Ethereum address are case-insensitive; Cardano accounts are stored in bech32, so a CIP-30
  wallet's hex address has to be converted before the lookup.

## 2. Builder connect: one signature onboarding

Builder connect lets an app onboard a Strike user with one signature from their own wallet, on Cardano, Ethereum or
Solana, and gives the app an API wallet that can act for them. FTL's builder code is `FTL`, registered on mainnet.

```text
browser                                         Strike
  generate an Ed25519 key (WebCrypto, extractable: false)
  POST /auth/builder/request-signature  ───────▶  { address, chain, code: "FTL", fee_share_bps: 0, public_key }
                                        ◀───────  { nonce, message_to_sign }
  wallet signs message_to_sign (CIP-30 / EIP-191 / ed25519)
  POST /auth/builder/verify-signature   ───────▶  { nonce, wallet_signature }
                                        ◀───────  { account_id, api_wallet_public_key, ... }
```

- **The key never leaves the tab.** It is created with `extractable: false`, so even the page's own code cannot read
  it, and FTL's servers never see it. It lives as long as the tab. This keeps one of FTL's project rules: we never
  store a key that can trade.
- **FTL asks for a 0% builder fee.** FTL places no orders of its own today, so it charges nothing. The wallet's
  consent message says so in Strike's own words.
- **The wallet must be the one the player signed in with.** FTL checks the connected wallet maps to the same Strike
  account before asking for a signature.

The code is in [`apps/web/lib/strike-copy.ts`](../apps/web/lib/strike-copy.ts).

## 3. Copy trading: from conviction to volume

Every signed request carries four headers, and the signature covers
`METHOD:PATH:TIMESTAMP:NONCE:SHA256(body)`. Timestamps must not be in the future, so FTL reads `GET /v2/time` once
and follows Strike's clock.

| Call | Used for |
|---|---|
| `GET /v2/copy/lead-traders?limit=1` | Live minimums (`min_copy_amount`, currently $20) and the profit share rate |
| `GET /v2/account?account_id=` | The player's available balance, so the panel refuses a plan that does not fit |
| `GET /v2/copy/subscriptions?account_id=&status=active` | Which picked traders the player already copies, and the profile page's live list with PnL |
| `POST /v2/copy/subscribe` (signed) | One copy per picked trader |
| `DELETE /v2/copy/subscribe/{id}` (signed) | The Stop button on the profile page; Strike closes that copy's positions at market |

Each copy is a `fixed_ratio` copy, with the amount the player sets aside as both the `copy_amount` and the
`max_margin_total`, so a copy can never put more margin to work than the player set aside for it. An optional
`stop_loss_amount` ends the copy when its loss reaches that figure. A `409 already copying` is shown as "Copying",
not as an error.

Why this matters for Strike: a week of watching a trader score is better due diligence than a PnL leaderboard, and
the step from there to a real copy is one signature. Every copy is volume on Strike's book, and every winning copy
pays the trader Strike's 10% profit share, which gives Strike's best traders a reason to send their followers to
FTL. The economics, including how FTL can earn later without charging players, are in [economics.md](economics.md).
