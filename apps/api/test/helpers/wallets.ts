// Test wallets that sign exactly like real ones: CIP-30 signData for Cardano (COSE_Sign1 with
// the address in the protected header), raw Ed25519 over UTF-8 for Solana (Phantom signMessage).
import { generateKeyPairSync, sign } from "node:crypto";
import CSL from "@emurgo/cardano-serialization-lib-nodejs";
import MS from "@emurgo/cardano-message-signing-nodejs";
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { base58, hex as hexCodec } from "@scure/base";
import { eip191Hash, ethAddressOf } from "../../src/domain/auth/verify.js";

const hex = (b: Uint8Array) => Buffer.from(b).toString("hex");

export function cardanoWallet(network: 0 | 1 = 1) {
  const pay = CSL.PrivateKey.generate_ed25519();
  const stake = CSL.PrivateKey.generate_ed25519();
  const address = CSL.BaseAddress.new(
    network,
    CSL.Credential.from_keyhash(pay.to_public().hash()),
    CSL.Credential.from_keyhash(stake.to_public().hash()),
  ).to_address();

  return {
    bech32: address.to_bech32(),
    hex: hex(address.to_bytes()),
    signData(message: string, signer = pay) {
      const prot = MS.HeaderMap.new();
      prot.set_algorithm_id(MS.Label.from_algorithm_id(MS.AlgorithmId.EdDSA));
      prot.set_header(MS.Label.new_text("address"), MS.CBORValue.new_bytes(address.to_bytes()));
      const headers = MS.Headers.new(MS.ProtectedHeaderMap.new(prot), MS.HeaderMap.new());
      const builder = MS.COSESign1Builder.new(headers, Buffer.from(message, "utf8"), false);
      const sig = signer.sign(builder.make_data_to_sign().to_bytes());
      const key = MS.COSEKey.new(MS.Label.from_key_type(MS.KeyType.OKP));
      key.set_algorithm_id(MS.Label.from_algorithm_id(MS.AlgorithmId.EdDSA));
      key.set_header(MS.Label.new_int(MS.Int.new_negative(MS.BigNum.from_str("1"))), MS.CBORValue.new_int(MS.Int.new_i32(6)));
      key.set_header(MS.Label.new_int(MS.Int.new_negative(MS.BigNum.from_str("2"))), MS.CBORValue.new_bytes(signer.to_public().as_bytes()));
      return { signature: hex(builder.build(sig.to_bytes()).to_bytes()), key: hex(key.to_bytes()) };
    },
    otherKey: () => CSL.PrivateKey.generate_ed25519(),
  };
}

export function solanaWallet() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const raw = publicKey.export({ format: "der", type: "spki" }).subarray(-32);
  return {
    address: base58.encode(raw),
    signMessage: (message: string) => base58.encode(sign(null, Buffer.from(message, "utf8"), privateKey)),
  };
}

/** An Ethereum wallet that signs like MetaMask/OKX personal_sign: 0x + r || s || v, v = 27 or 28. */
export function ethereumWallet(secret?: Uint8Array) {
  const sk = secret ?? secp256k1.utils.randomSecretKey();
  const address = ethAddressOf(secp256k1.getPublicKey(sk, false));
  return {
    address,
    signMessage(message: string) {
      const sig = secp256k1.sign(eip191Hash(message), sk, { prehash: false, format: "recovered" });
      const out = new Uint8Array(65);
      out.set(sig.subarray(1), 0);
      out[64] = (sig[0] as number) + 27;
      return `0x${hexCodec.encode(out)}`;
    },
  };
}
