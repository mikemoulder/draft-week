"""Architecture spike: does a realistically drafted league produce a dramatic game of the week,
and how big is the per-trader daily snapshot the app would ship?

Reads the cache written by fantasy_check.py. usage: python3 -I replay_spike.py <cache_dir>
"""
import glob, json, os, random, statistics, sys, time

CACHE = sys.argv[1]
DAY = 86_400_000
board = json.load(open(os.path.join(CACHE, "board7d.json")))
pool = [e for e in board if not e["account_id"].startswith("vault_") and not e.get("vault_id")
        and 5 <= int(e["total_trades"]) <= 3000]
fills = {e["account_id"]: json.load(open(os.path.join(CACHE, f"fills_{e['account_id']}.json"))) for e in pool}
end = max(max((f["timestamp"] for f in v), default=0) for v in fills.values())
start = end - 7 * DAY

# 1. The snapshot the app ships: per trader, per day aggregates + liquidation timestamps.
snap = []
for e in pool:
    a = e["account_id"]
    days = [{"pnl": 0.0, "wins": 0, "trades": 0, "liqs": []} for _ in range(7)]
    for f in fills[a]:
        d = min(6, max(0, (f["timestamp"] - start) // DAY))
        days[d]["pnl"] += float(f["realized_pnl"] or 0) - float(f["fee"] or 0)
        days[d]["trades"] += 1
        days[d]["wins"] += float(f["realized_pnl"] or 0) > 0
        if f.get("auto_close_type") in ("liquidation", "adl", "bankrupt") and f["timestamp"] not in days[d]["liqs"]:
            days[d]["liqs"].append(f["timestamp"])
    for d in days:
        d["pnl"] = round(d["pnl"], 2)
        d["liqs"] = sorted(set(d["liqs"]))[:5]
    snap.append({"id": a, "name": e.get("nickname") or e.get("ada_handle") or a[:8],
                 "equity": round(max(float(e.get("equity") or 0), 100)), "winRate": e.get("win_rate_pct"),
                 "pnl7d": e["total_pnl"], "days": days})
blob = json.dumps(snap, separators=(",", ":"))
print(f"snapshot: {len(snap)} traders, {len(blob)/1024:.0f} KB raw")

# 2. Rank scoring (validated earlier): 1..10 by daily return decile, -5 per liquidation order-day.
for d in range(7):
    act = sorted((t["days"][d]["pnl"] / t["equity"], t["id"]) for t in snap if t["days"][d]["trades"])
    for i, (_, a) in enumerate(act):
        pass
pts = {t["id"]: [0] * 7 for t in snap}
for d in range(7):
    act = sorted((t["days"][d]["pnl"] / t["equity"], t["id"]) for t in snap if t["days"][d]["trades"])
    for i, (_, a) in enumerate(act):
        pts[a][d] = 1 + int(10 * i / len(act))
for t in snap:
    for d in range(7):
        pts[t["id"]][d] -= 5 * min(1, len(t["days"][d]["liqs"]))
active = {t["id"]: sum(1 for d in t["days"] if d["trades"]) for t in snap}
name = {t["id"]: t["name"] for t in snap}


# 3. Realistic draft: managers prefer active, profitable traders, with noise. Snake draft, 8 x 5.
def draft(rng):
    avail = sorted(snap, key=lambda t: -(active[t["id"]] * 2 + rng.random() * 6 + (float(t["pnl7d"]) > 0) * 2))
    avail = [t["id"] for t in avail]
    teams = [[] for _ in range(8)]
    order = list(range(8)) + list(range(7, -1, -1))
    for r in range(5):
        for m in (order[:8] if r % 2 == 0 else order[8:]):
            pick = avail.pop(rng.randrange(min(4, len(avail))))
            teams[m].append(pick)
    return teams


def team_daily(team):
    # captain = first pick x1.5, starters = first 3, bench auto-sub for inactive starters
    starters, bench = team[:3], team[3:]
    out = []
    for d in range(7):
        s = 0.0
        used = set()
        for j, a in enumerate(starters):
            if pts[a][d] == 0:
                sub = next((b for b in bench if b not in used and pts[b][d] != 0), None)
                if sub:
                    used.add(sub)
                    a = sub
            s += pts[a][d] * (1.5 if j == 0 else 1)
        out.append(s)
    return out


def drama(A, B):
    ca = cb = 0.0
    leader, changes = None, 0
    for x, y in zip(team_daily(A), team_daily(B)):
        ca += x; cb += y
        lead = "A" if ca > cb else "B" if cb > ca else leader
        changes += leader is not None and lead != leader
        leader = lead
    liqs = sum(1 for a in A + B for d in range(7) if pts[a][d] < 0)
    margin = abs(ca - cb) / max(1, ca + cb)
    return changes, margin, liqs, ca, cb


rng = random.Random(11)
best_changes, best_margins, has_liq = [], [], 0
for _ in range(500):
    teams = draft(rng)
    games = [drama(teams[i], teams[j]) for i in range(8) for j in range(i + 1, 8)]
    # "game of the week": most lead changes, then closest, then has a liquidation
    g = max(games, key=lambda g: (g[0], g[2] > 0, -g[1]))
    best_changes.append(g[0]); best_margins.append(g[1]); has_liq += g[2] > 0
print(f"leagues: 500 | game of the week lead changes: median {statistics.median(best_changes)}, min {min(best_changes)}"
      f" | final margin median {statistics.median(best_margins):.0%} | has a liquidation {has_liq/500:.0%}")

teams = draft(random.Random(3))
games = sorted(((drama(teams[i], teams[j]), i, j) for i in range(8) for j in range(i + 1, 8)),
               key=lambda x: (x[0][0], x[0][2] > 0, -x[0][1]), reverse=True)
(g, i, j) = games[0]
print(f"\nexample game of the week: lead changes {g[0]}, score {g[3]:.1f} - {g[4]:.1f}")
for label, T in (("A", teams[i]), ("B", teams[j])):
    run, line = 0.0, []
    for x in team_daily(T):
        run += x; line.append(round(run, 1))
    print(f" {label}: {[name[a][:12] for a in T]}\n    cumulative by day {line}")
