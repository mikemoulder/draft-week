import { createPublicKey, verify as cryptoVerify } from "node:crypto";
import verifyDataSignature from "@cardano-foundation/cardano-verify-datasignature";
import { base58 } from "@scure/base";
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

export const SUPPORTED_CHAINS: readonly Chain[] = ["cardano", "solana"];

export function verifySignature(chain: Chain, input: SignatureInput): boolean {
  try {
    switch (chain) {
      case "cardano":
        return verifyCardano(input);
      case "solana":
        return verifySolana(input);
      case "ethereum":
        return false;
    }
  } catch {
    // Malformed CBOR, base58 or key material is a failed sign-in, not a server error.
    return false;
  }
}
