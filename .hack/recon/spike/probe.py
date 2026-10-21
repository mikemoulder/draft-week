import json,sys,time,urllib.request
B=sys.argv[1]
def get(path):
    t=time.time()
    try:
        r=urllib.request.urlopen(urllib.request.Request(B+path,headers={'User-Agent':'recon'}),timeout=20); body=r.read(); code=r.status; hdr=dict(r.headers)
    except urllib.error.HTTPError as e: body=e.read(); code=e.code; hdr=dict(e.headers)
    dt=(time.time()-t)*1000
    try: j=json.loads(body)
    except: j=body[:200]
    return code,dt,j,hdr
def show(path,n=600):
    code,dt,j,h=get(path)
    rl={k:v for k,v in h.items() if 'limit' in k.lower() or k.lower()=='x-cache'}
    print(f'--- {path}  {code}  {dt:.0f}ms {rl}')
    print(json.dumps(j)[:n])
    return j
ei=show('/price/v2/exchangeInfo',400)
syms=[s['symbol'] for s in ei.get('symbols',[])] if isinstance(ei,dict) else []
print('SYMBOLS',len(syms),syms)
if isinstance(ei,dict): print('RATELIMITS',ei.get('rateLimits')); print('SYM0',json.dumps(ei['symbols'][0])[:900] if syms else '')
for p in ['/price/v2/ticker/24hr?symbol=BTC-USD','/price/v2/premiumIndex?symbol=BTC-USD','/price/v2/depth?symbol=BTC-USD&limit=5','/price/v2/trades?symbol=BTC-USD&limit=3','/price/v2/klines?symbol=BTC-USD&interval=1h&limit=2','/price/v2/openInterest','/v2/l3/snapshot?symbol=BTC-USD','/v2/fee-tiers','/stat/v1/dashboard/summary','/stat/v1/stats/leaderboard?limit=3','/stat/v1/stats/coin/liquidation-map?symbol=BTC-USD','/stat/v1/stats/live-positions?symbol=BTC-USD','/stat/v1/stats/coin/funding-rate-comparison','/v2/copy/discover?top=3','/v2/copy/leaderboard','/v2/vaults','/stat/v1/dashboard/copy-trading-summary']:
    show(p)
