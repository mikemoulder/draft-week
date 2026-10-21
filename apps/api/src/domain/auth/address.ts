import { base58, bech32, hex } from "@scure/base";
import type { Chain } from "@draftweek/shared";

export type Normalized = { ok: true; address: string } | { ok: false; reason: string };

// Cardano addresses exceed bech32's default 90 character limit.
const BECH32_LIMIT = 1000;

// CIP-19 header: high nibble is the address type, low nibble the network id (1 = mainnet).
function cardanoFromBytes(bytes: Uint8Array): Normalized {
  const header = bytes[0];
  if (header === undefined) return { ok: false, reason: "empty address" };
  const type = header >> 4;
  const network = header & 0x0f;
  if (network !== 1) return { ok: false, reason: "only Cardano mainnet addresses are supported" };
  const prefix = type <= 7 ? "addr" : type === 14 || type === 15 ? "stake" : null;
  if (!prefix) return { ok: false, reason: "unsupported Cardano address type" };
  return { ok: true, address: bech32.encode(prefix, bech32.toWords(bytes), BECH32_LIMIT) };
}

function normalizeCardano(input: string): Normalized {
  // CIP-30 wallets hand out addresses as hex bytes; people paste bech32. Accept both.
  if (/^[0-9a-f]+$/i.test(input) && input.length % 2 === 0) {
    return cardanoFromBytes(hex.decode(input.toLowerCase()));
  }
  try {
    const { prefix, words } = bech32.decode(input as `${string}1${string}`, BECH32_LIMIT);
    if (prefix !== "addr" && prefix !== "stake") {
      return { ok: false, reason: "only Cardano mainnet addresses are supported" };
    }
    return cardanoFromBytes(bech32.fromWords(words));
  } catch {
    return { ok: false, reason: "not a valid Cardano address" };
  }
}

function normalizeSolana(input: string): Normalized {
  try {
    const bytes = base58.decode(input);
    if (bytes.length !== 32) return { ok: false, reason: "not a valid Solana address" };
    return { ok: true, address: base58.encode(bytes) };
  } catch {
    return { ok: false, reason: "not a valid Solana address" };
  }
}

function normalizeEthereum(input: string): Normalized {
  if (!/^0x[0-9a-fA-F]{40}$/.test(input)) return { ok: false, reason: "not a valid Ethereum address" };
  return { ok: true, address: input.toLowerCase() };
}

export function normalizeAddress(chain: Chain, input: string): Normalized {
  const trimmed = input.trim();
  switch (chain) {
    case "cardano":
      return normalizeCardano(trimmed);
    case "solana":
      return normalizeSolana(trimmed);
    case "ethereum":
      return normalizeEthereum(trimmed);
  }
}
