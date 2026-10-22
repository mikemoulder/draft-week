import { createPublicKey, verify as cryptoVerify } from "node:crypto";
import verifyDataSignature from "@cardano-foundation/cardano-verify-datasignature";
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { base58, hex } from "@scure/base";
import type { Chain } from "@draftweek/shared";

export type SignatureInput = {
  address: string;
  message: string;
  signature: string;
  key?: string | undefined;
};

// Raw 32-byte Ed25519 keys need this DER prefix to become an SPKI key for node:crypto.
const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

function verifyCardano(input: SignatureInput): boolean {
  if (!input.key) return false;
  // Checks the COSE_Sign1 signature against the COSE key, that the signed payload is exactly
  // our message, and that the key hashes to the claimed address.
  return verifyDataSignature(input.signature, input.key, input.message, input.address);
}

function verifySolana(input: SignatureInput): boolean {
  const publicKey = createPublicKey({
    key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(base58.decode(input.address))]),
    format: "der",
    type: "spki",
  });
  return cryptoVerify(null, Buffer.from(input.message, "utf8"), publicKey, Buffer.from(base58.decode(input.signature)));
}

/** EIP-191 personal_sign hash: keccak256("\x19Ethereum Signed Message:\n" + byte length + message). */
export function eip191Hash(message: string): Uint8Array {
  const body = new TextEncoder().encode(message);
  const prefix = new TextEncoder().encode(`\x19Ethereum Signed Message:\n${body.length}`);
  const all = new Uint8Array(prefix.length + body.length);
  all.set(prefix);
  all.set(body, prefix.length);
  return keccak_256(all);
}

export function ethAddressOf(uncompressedKey: Uint8Array): string {
  return `0x${hex.encode(keccak_256(uncompressedKey.subarray(1)).subarray(12))}`;
}

// Wallets return r || s || v with v = 27 or 28 (sometimes 0 or 1); noble wants the recovery byte first.
function verifyEthereum(input: SignatureInput): boolean {
  const raw = hex.decode(input.signature.replace(/^0x/, "").toLowerCase());
  if (raw.length !== 65) return false;
  const v = raw[64] as number;
  const recovery = v >= 27 ? v - 27 : v;
  if (recovery !== 0 && recovery !== 1) return false;
  const sig = new Uint8Array(65);
  sig[0] = recovery;
  sig.set(raw.subarray(0, 64), 1);
  const compressed = secp256k1.recoverPublicKey(sig, eip191Hash(input.message), { prehash: false });
  const uncompressed = secp256k1.Point.fromBytes(compressed).toBytes(false);
  return ethAddressOf(uncompressed) === input.address.toLowerCase();
}

export const SUPPORTED_CHAINS: readonly Chain[] = ["cardano", "solana", "ethereum"];

export function verifySignature(chain: Chain, input: SignatureInput): boolean {
  try {
    switch (chain) {
      case "cardano":
        return verifyCardano(input);
      case "solana":
        return verifySolana(input);
      case "ethereum":
        return verifyEthereum(input);
    }
  } catch {
    // Malformed CBOR, base58 or key material is a failed sign-in, not a server error.
    return false;
  }
}
