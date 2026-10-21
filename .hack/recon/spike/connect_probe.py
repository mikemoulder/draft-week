import json,sys,urllib.request
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives import serialization as S
B='https://api-v2-testnet.strikefinance.org'
ALPH='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
def b58(b):
    n=int.from_bytes(b,'big'); s=''
    while n: n,r=divmod(n,58); s=ALPH[r]+s
    return '1'*(len(b)-len(b.lstrip(b'\0')))+s
pub=lambda k:k.public_key().public_bytes(S.Encoding.Raw,S.PublicFormat.Raw)
sol=Ed25519PrivateKey.generate(); api=Ed25519PrivateKey.generate()
def post(path,body):
    r=urllib.request.Request(B+path,data=json.dumps(body).encode(),headers={'Content-Type':'application/json','User-Agent':'strike-recon/0.1'})
    try: x=urllib.request.urlopen(r,timeout=20); return x.status,x.read().decode()
    except urllib.error.HTTPError as e: return e.code,e.read().decode()
for code in sys.argv[1:]:
    print(code,'->',post('/auth/builder/request-signature',{'address':b58(pub(sol)),'chain':'solana','code':code,'fee_share_bps':0,'public_key':pub(api).hex()}))
