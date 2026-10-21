"""Go/no-go check for the fantasy league idea.

Pulls the last 7 days of real Strike fills for active traders, scores them per day,
then simulates random 8-manager leagues to see whether matchups are close and eventful.

usage: python3 -I fantasy_check.py <cache_dir>
"""
import json, os, random, statistics, sys, time, urllib.request
from collections import defaultdict

API = "https://api.strikefinance.org"
UA = {"User-Agent": "strike-fantasy-check/0.1"}
DAY = 86_400_000
CACHE = sys.argv[1] if len(sys.argv) > 1 else "."


def get(path):
    req = urllib.request.Request(API + path, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def cached(name, fn):
    p = os.path.join(CACHE, name)
    if os.path.exists(p):
        return json.load(open(p))
    data = fn()
    json.dump(data, open(p, "w"))
    return data


now = int(time.time() * 1000)
start = now - 7 * DAY

board = cached("board7d.json", lambda: get(
    "/stat/v1/stats/leaderboard?time_range=7d&platform=strike&sort_by=trades&limit=300")["entries"])

# Pool: humans-ish. Drop vaults and very high-frequency accounts (market makers / bots).
pool = [e for e in board
        if not e.get("vault_id") and not e["account_id"].startswith("vault_")
        and 5 <= int(e["total_trades"]) <= 3000]
print(f"leaderboard rows {len(board)}, draftable pool {len(pool)}")


def fills_for(acct):
    out, cursor = [], None
    for _ in range(4):  # up to 4000 fills
        q = f"/v2/history/fill?account_id={acct}&startTime={start}&limit=1000"
        if cursor:
            q += f"&fromId={cursor}"
        page = get(q).get("fills") or []
        out += page
        if len(page) < 1000:
            break
        cursor = min(f["id"] for f in page)
    return out


fills = {}
for i, e in enumerate(pool):
    a = e["account_id"]
    fills[a] = cached(f"fills_{a}.json", lambda a=a: fills_for(a))
print("fills fetched:", sum(len(v) for v in fills.values()))

ts_key = next(k for k in ("timestamp", "time", "create_timestamp", "created_at")
              if pool and fills[pool[0]["account_id"]] and k in fills[pool[0]["account_id"]][0])

# Daily score per trader. Return-based so small accounts can compete.
#   points = 100 * net realized pnl / equity   (capped at +-50 per day)
#   +1 per winning close, -15 per liquidation / ADL / bankruptcy order
def day_of(ts):
    return min(6, max(0, (int(ts) - start) // DAY))


SCORING = os.environ.get("SCORING", "return")
CAPT = 1.5 if SCORING == "rank" else 2
score = {}
meta = {}
raw = {}
for e in pool:
    a = e["account_id"]
    eq = max(float(e.get("equity") or 0), float(e.get("wallet_balance") or 0), 100.0)
    days = [0.0] * 7
    pnl = [0.0] * 7
    wins = [0] * 7
    liq_orders = [set() for _ in range(7)]
    for f in fills[a]:
        d = day_of(f[ts_key])
        r = float(f.get("realized_pnl") or 0) - float(f.get("fee") or 0)
        pnl[d] += r
        if float(f.get("realized_pnl") or 0) > 0:
            wins[d] += 1
        if f.get("auto_close_type") in ("liquidation", "adl", "bankrupt"):
            liq_orders[d].add(f.get("order_id"))
    for d in range(7):
        pts = max(-50.0, min(50.0, 100 * pnl[d] / eq)) + min(wins[d], 10) - 15 * len(liq_orders[d])
        days[d] = round(pts, 1)
    score[a] = days
    raw[a] = (pnl, wins, [len(s) for s in liq_orders], eq)
    meta[a] = {"name": e.get("nickname") or e.get("ada_handle") or a[:8], "equity": round(eq),
               "liqs": sum(len(s) for s in liq_orders), "active_days": sum(1 for d in range(7) if pnl[d] or wins[d])}

if SCORING == "rank":
    # Each day, rank every active trader by return: 1..10 points by decile.
    # Inactive day = 0, liquidation = -5. Every active day is worth something.
    for d in range(7):
        act = sorted((raw[a][0][d] / raw[a][3], a) for a in raw if raw[a][0][d] or raw[a][1][d])
        for i, (_, a) in enumerate(act):
            score[a][d] = 1 + int(10 * i / len(act)) - 5 * raw[a][2][d]

liq_total = sum(m["liqs"] for m in meta.values())
active_share = statistics.mean(m["active_days"] / 7 for m in meta.values())
print(f"liquidation events in pool: {liq_total}; avg trader active {active_share:.0%} of days")
weekly = sorted(((sum(score[a]), meta[a]["name"]) for a in score), reverse=True)
print("best weeks:", weekly[:5])
print("worst weeks:", weekly[-5:])

# Simulate leagues: 8 managers, 5 picks each (random draft), captain x2, round-robin first week pairings.
random.seed(7)
margins, lead_changes, dead_rosters = [], [], 0
example = None
ids = list(score)
for _ in range(2000):
    picks = random.sample(ids, 40)
    teams = [picks[i * 5:(i + 1) * 5] for i in range(8)]
    for t in teams:
        if all(meta[a]["active_days"] == 0 for a in t):
            dead_rosters += 1
    for m in range(4):
        A, B = teams[2 * m], teams[2 * m + 1]
        cum = [0.0, 0.0]
        leader, changes = None, 0
        for d in range(7):
            for k, T in enumerate((A, B)):
                cum[k] += sum(score[a][d] * (CAPT if j == 0 else 1) for j, a in enumerate(T))
            lead = 0 if cum[0] > cum[1] else 1 if cum[1] > cum[0] else leader
            if leader is not None and lead != leader:
                changes += 1
            leader = lead
        total = abs(cum[0]) + abs(cum[1]) or 1
        margins.append(abs(cum[0] - cum[1]) / total)
        lead_changes.append(changes)
        if example is None and changes >= 2:
            example = (A, B)

print(f"matchups simulated: {len(margins)}")
print(f"close games (margin < 20% of combined score): {sum(m < 0.2 for m in margins) / len(margins):.0%}")
print(f"games with at least one lead change: {sum(c >= 1 for c in lead_changes) / len(lead_changes):.0%}")
print(f"avg lead changes per game: {statistics.mean(lead_changes):.2f}")
print(f"rosters with zero activity all week: {dead_rosters / (2000 * 8):.1%}")

if example:
    print("\nexample matchup (captain first), points per day:")
    for label, T in zip("AB", example):
        print(f" team {label}")
        for j, a in enumerate(T):
            mult = CAPT if j == 0 else 1
            print(f"   {'C' if j == 0 else ' '} {meta[a]['name'][:16]:16} eq ${meta[a]['equity']:>7} liqs {meta[a]['liqs']} "
                  f"{[round(x * mult) for x in score[a]]} = {round(sum(score[a]) * mult)}")
