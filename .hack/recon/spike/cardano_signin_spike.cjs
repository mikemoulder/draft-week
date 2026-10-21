const verify = require('@cardano-foundation/cardano-verify-datasignature');
const CSL = require('@emurgo/cardano-serialization-lib-nodejs');
const MS = require('@emurgo/cardano-message-signing-nodejs');
const hex = (b) => Buffer.from(b).toString('hex');
const check = (label, got, want) => console.log(`${got === want ? 'PASS' : 'FAIL'}  ${label} -> ${got}`);

// 1. Real wallet vector from the library README (stake address).
const vk = 'a4010103272006215820b89526fd6bf4ba737c55ea90670d16a27f8de6cc1982349b3b676705a2f420c6';
const vs = '84582aa201276761646472657373581de118987c1612069d4080a0eb247820cb987fea81bddeaafdd41f996281a166686173686564f458264175677573746120416461204b696e672c20436f756e74657373206f66204c6f76656c61636558401712458b19f606b322982f6290c78529a235b56c0f1cec4f24b12a8660b40cd37f4c5440a465754089c462ed4b0d613bffaee3d1833516569fda4852f42a4a0f';
check('README vector, message + stake address', verify(vs, vk, 'Augusta Ada King, Countess of Lovelace', 'stake1uyvfslqkzgrf6syq5r4jg7pqewv8l65phh024lw5r7vk9qgznhyty'), true);

// 2. Our own CIP-30-style signature with a mainnet base address (addr1...), as Strike users have.
const pay = CSL.PrivateKey.generate_ed25519();
const stake = CSL.PrivateKey.generate_ed25519();
const addr = CSL.BaseAddress.new(1,
  CSL.Credential.from_keyhash(pay.to_public().hash()),
  CSL.Credential.from_keyhash(stake.to_public().hash())).to_address();
const bech = addr.to_bech32();

function cip30Sign(privKey, addressBytes, message) {
  const prot = MS.HeaderMap.new();
  prot.set_algorithm_id(MS.Label.from_algorithm_id(MS.AlgorithmId.EdDSA));
  prot.set_header(MS.Label.new_text('address'), MS.CBORValue.new_bytes(addressBytes));
  const headers = MS.Headers.new(MS.ProtectedHeaderMap.new(prot), MS.HeaderMap.new());
  const builder = MS.COSESign1Builder.new(headers, Buffer.from(message, 'utf8'), false);
  const sig = privKey.sign(builder.make_data_to_sign().to_bytes());
  const signature = hex(builder.build(sig.to_bytes()).to_bytes());
  const key = MS.COSEKey.new(MS.Label.from_key_type(MS.KeyType.OKP));
  key.set_algorithm_id(MS.Label.from_algorithm_id(MS.AlgorithmId.EdDSA));
  key.set_header(MS.Label.new_int(MS.Int.new_negative(MS.BigNum.from_str('1'))), MS.CBORValue.new_int(MS.Int.new_i32(6)));
  key.set_header(MS.Label.new_int(MS.Int.new_negative(MS.BigNum.from_str('2'))), MS.CBORValue.new_bytes(privKey.to_public().as_bytes()));
  return { signature, key: hex(key.to_bytes()) };
}

const msg = 'draftweek.vercel.app wants you to sign in.\nNonce: 3f2a9c\nIssued At: 2026-10-21T20:00:00Z\nExpiration: 2026-10-21T20:05:00Z';
const { signature, key } = cip30Sign(pay, addr.to_bytes(), msg);
console.log('address', bech.slice(0, 24) + '...');
check('own sig, message + base address', verify(signature, key, msg, bech), true);
check('tampered message rejected', verify(signature, key, msg.replace('3f2a9c', '000000'), bech), false);
const other = CSL.BaseAddress.new(1, CSL.Credential.from_keyhash(CSL.PrivateKey.generate_ed25519().to_public().hash()),
  CSL.Credential.from_keyhash(stake.to_public().hash())).to_address().to_bech32();
check('someone else\'s address rejected', verify(signature, key, msg, other), false);
const evil = CSL.PrivateKey.generate_ed25519();
const forged = cip30Sign(evil, addr.to_bytes(), msg);   // attacker signs claiming the victim's address header
check('forged key claiming victim address rejected', verify(forged.signature, forged.key, msg, bech), false);
let t = Date.now(); for (let i = 0; i < 200; i++) verify(signature, key, msg, bech);
console.log(`verify cost: ${((Date.now() - t) / 200).toFixed(2)} ms per call`);
