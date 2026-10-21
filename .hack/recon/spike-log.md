# Spike log

Scripts are in `.hack/recon/spike/`: `probe.py <base-url>` for REST, `ws.mjs <wss-url> <sub-json>...` for
WebSockets (Node 22 built-in WebSocket, no deps), and `connect_probe.py <code>` for the builder connect challenge.

## Strike public data (REST + WS + L3) · 2026-10-21 · Claude

**Version:** API v2 (OpenAPI "2.0.0"); mainnet `api.strikefinance.org`, testnet `api-v2-testnet.strikefinance.org`
**Docs read:** docs.strikefinance.org (GitBook, no version selector) + strike-finance-skills v0.0.4

### Can you get a key right now?

```text
[x] self-serve, worked immediately: no key needed for anything in this section
```

### Did the quickstart run?

```bash
python3 -I .hack/recon/spike/probe.py https://api.strikefinance.org
python3 -I .hack/recon/spike/probe.py https://api-v2-testnet.strikefinance.org
node .hack/recon/spike/ws.mjs wss://api.strikefinance.org/ws/price '{"method":"subscribe","channel":"bookTicker","symbol":"BTC-USD","id":1}'
node .hack/recon/spike/ws.mjs wss://api.strikefinance.org/ws/l3 '{"method":"SUBSCRIBE","params":["btc-usd@l3","eth-usd@l3"],"id":1}'
```

```text
[x] ran after fixing: base path prefixes, User-Agent, newline-batched WS frames
```

**Runtime:** Linux, Python 3.12 (stdlib + cryptography 41), Node v22.23.3

### What does a real response look like?

```json
// GET /price/v2/premiumIndex?symbol=BTC-USD
{"symbol":"BTC-USD","markPrice":"84203.31267379","indexPrice":"84235.18691826","fundingRate":"-0.0000421784533093243","nextFundingTime":1792594800000,"interestRate":"0.0001", ...}
// GET /v2/l3/snapshot?symbol=BTC-USD
{"type":"l3_snapshot","symbol":"BTC-USD","last_sequence":797113799,"bids":[{"price":"84196","orders":[{"order_id":"Ns0zdn9xxe0FhNXDuWvnCA","size":"0.01781"}]}, ...]}
// wss /ws/l3
{"type":"l3_update","symbol":"ETH-USD","action":"cancel","order_id":"l-Zm02NT-Qbb91mec22K6w","side":"buy","price":"2484.1","delta_size":"-8.033","remaining_size":"0","sequence":1163497,"timestamp":1792594209085}
// GET /v2/positions?blockchain_address=addr1qyhky3... (NO AUTH)
{"count":2,"positions":[{"id":223295,"margin_mode":"cross","leverage":20,"size":"-0.004","entry_price":"7778.7","symbol":"SP500-USD","upnl":"0.176", ...}]}
// GET /stat/v1/stats/coin/funding-rate-comparison
{"data":[{"symbol":"ADA-USD","strike":{"rate":"0.00146288"},"bybit":{"rate":"0.00010000"},"binance":{...},"lighter":{...},"okx":{...}, ...}]}
```

**Latency:** REST 60-200 ms warm (Cloudflare FRA; `X-Cache: HIT/MISS/STALE`, 5 s TTL on klines). `/v2/vaults` 300 ms mainnet, 1.3 s testnet. WS open 240-290 ms.
**Throughput (12 s windows):** L3 BTC+ETH 5,515 msgs (about 460/s). `/ws/price` BTC: 22 bookTicker, 15 depthUpdate, 0 trades.

### What did the docs not say?

```text
1. Three base paths. Market data is /price/v2/*, stats are /stat/v1/*, trading and account are /v2/*.
   The prose pages never say so; it is only in the OpenAPI "servers" field. GET /v2/exchangeInfo -> 404.
2. Cloudflare rejects Python's default urllib User-Agent with "403 error code: 1010". Send any UA.
3. /ws/price packs several JSON messages per frame, separated by "\n". JSON.parse(frame) throws.
   (The docs say this only for the user stream, and say L3 is not batched, which held true.)
4. L3 docs say "initial enabled symbol is BTC-USD", but eth-usd@l3 streamed fine.
5. Account, positions and fill history are PUBLIC by blockchain_address / account_id / vault_id.
   /v2/account with no params says "authentication required or provide vault_id, account_id, or blockchain_address".
6. /stat/v1/dashboard/summary returns open_interest_usd "0" on both networks (broken field).
   24h ticker returns count/firstId/lastId = 0.
7. Testnet market data is effectively dead: 4 symbols, BTC book has no asks, last trade days ago.
   Live demos have to use mainnet data.
8. Margin asset in exchangeInfo is "USDT" while symbols are "-USD".
9. testnet.strikefinance.org (web app) exists; it is not mentioned in the docs.
```

### Verdict

```text
[x] usable with a caveat: mainnet only for anything that should look alive; volume is thin
```

**Feasibility multiplier:** 1.5x (Binance-compatible shapes, stdlib-callable, spiked end to end)

---

## Strike Builder Codes / signed trading · 2026-10-21 · Claude

**Version:** strike-builder-reference @ 2026-10-20 (React 18, Vite 6.4.1, @noble/ed25519 2.x)
**Docs read:** /api/getting-started, /api/builder-codes/*, reference app `src/api/*`

### Can you get a key right now?

```text
[ ] self-serve, but required a wallet login at app.strikefinance.org (API Wallets page or builder-codes page)
    NOT DONE: needs the user's wallet. Builder code approval time unknown.
```

### Did the quickstart run?

```bash
git clone https://github.com/strike-finance/strike-builder-reference && cd strike-builder-reference
npm ci && npm run build          # tsc + vite build, 14 s, clean
python3 -I .hack/recon/spike/connect_probe.py zz-not-a-real-code-123 ""
```

```text
[x] reference app compiles unmodified (defaults to testnet)
[ ] signed request: did not run, no registered key
```

### What does a real response look like?

```json
// POST /auth/builder/request-signature (testnet, throwaway Solana key)
{"error":"builder code not found"}     // 404 with a fake code
{"error":"code is required"}           // 400 with an empty code
```

### What did the docs not say?

```text
1. The connect challenge body is decoded strictly: unknown fields -> 400 (reference app comment).
   The challenge expires in 5 minutes.
2. Connecting again revokes earlier API wallets for that account + builder code (reference app comment).
3. Private stream is wss://<host>/ws/user-api with session.logon. /ws/user is the app's JWT endpoint. Do not use it.
4. Docs quickstart sends side/type lowercase ("buy","limit"); builder docs send uppercase. Unverified which is canonical.
5. Signature timestamp window is 3 minutes. GET /v2/time returns ms, while the header wants seconds.
```

### Verdict

```text
[ ] risky: the trading path depends on a key the user must create in a browser wallet.
    Prototype one signed GET /v2/account and one tiny order before committing an idea to trading.
```

**Feasibility multiplier:** 2x (clean reference app; auth is untested end to end)

---

## Carried forward

```text
This spike IS /skillz:architecture's hour-one risk spike. Do not run it twice.
Open risk to clear first if the idea trades: register an API wallet (and a builder code if
onboarding other users), then do one signed GET /v2/account on mainnet.
```
