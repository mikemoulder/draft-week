// Wallet detection and message signing, per chain. The server builds the message and checks
// the signature; this file only talks to the browser extension.
import { base58 } from "@scure/base";
import type { Chain } from "@draftweek/shared";

type Cip30Api = {
  getUsedAddresses(): Promise<string[]>;
  getChangeAddress(): Promise<string>;
  signData(address: string, payloadHex: string): Promise<{ signature: string; key: string }>;
};
type Cip30Wallet = { name: string; icon: string; enable(): Promise<Cip30Api> };
type SolanaProvider = {
  connect(): Promise<{ publicKey: { toBase58(): string } }>;
  signMessage(message: Uint8Array, display?: "utf8"): Promise<{ signature: Uint8Array }>;
};

declare global {
  interface Window {
    cardano?: Record<string, Cip30Wallet | undefined>;
    phantom?: { solana?: SolanaProvider & { isPhantom?: boolean } };
    solflare?: SolanaProvider & { isSolflare?: boolean };
  }
}

export type WalletOption = { id: string; chain: Chain; name: string; icon: string | null };

// CIP-30 wallets most Cardano users have. Unknown keys on window.cardano are ignored.
const CARDANO_KEYS = ["lace", "eternl", "nami", "vespr", "typhoncip30", "yoroi", "begin", "gerowallet", "flint"];

export function detectWallets(): WalletOption[] {
  if (typeof window === "undefined") return [];
  const found: WalletOption[] = [];
  for (const key of CARDANO_KEYS) {
    const w = window.cardano?.[key];
    if (w?.enable) found.push({ id: `cardano:${key}`, chain: "cardano", name: w.name || key, icon: w.icon || null });
  }
  if (window.phantom?.solana?.isPhantom) found.push({ id: "solana:phantom", chain: "solana", name: "Phantom", icon: null });
  if (window.solflare?.isSolflare) found.push({ id: "solana:solflare", chain: "solana", name: "Solflare", icon: null });
  return found;
}

const toHex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

export type ConnectedWallet = {
  chain: Chain;
  address: string;
  sign(message: string): Promise<{ signature: string; key?: string }>;
};

export async function connectWallet(option: WalletOption): Promise<ConnectedWallet> {
  const [chain, key] = option.id.split(":") as [Chain, string];

  if (chain === "cardano") {
    const wallet = window.cardano?.[key];
    if (!wallet) throw new Error(`${option.name} is not available in this browser`);
    const api = await wallet.enable();
    // The address the user actually trades from, falling back to the change address in a new wallet.
    const [used] = await api.getUsedAddresses();
    const address = used ?? (await api.getChangeAddress());
    return {
      chain,
      address,
      sign: (message) => api.signData(address, toHex(new TextEncoder().encode(message))),
    };
  }

  const provider = key === "phantom" ? window.phantom?.solana : window.solflare;
  if (!provider) throw new Error(`${option.name} is not available in this browser`);
  const { publicKey } = await provider.connect();
  return {
    chain,
    address: publicKey.toBase58(),
    sign: async (message) => {
      const { signature } = await provider.signMessage(new TextEncoder().encode(message), "utf8");
      return { signature: base58.encode(signature) };
    },
  };
}
