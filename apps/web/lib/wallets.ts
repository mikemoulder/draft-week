// Wallet detection and message signing, per chain. The server builds the message and checks the
// signature; this file only talks to browser extensions.
import { base58 } from "@scure/base";
import type { Chain } from "@draftweek/shared";

type Cip30Api = {
  getUsedAddresses(): Promise<string[]>;
  getChangeAddress(): Promise<string>;
  signData(address: string, payloadHex: string): Promise<{ signature: string; key: string }>;
};
type Cip30Wallet = { name?: string; icon?: string; enable?: () => Promise<Cip30Api> };
type SolanaProvider = {
  connect(): Promise<{ publicKey: { toBase58(): string } }>;
  signMessage(message: Uint8Array, display?: "utf8"): Promise<{ signature: Uint8Array } | Uint8Array>;
};
type Eip1193 = { request(args: { method: string; params?: unknown[] }): Promise<unknown> };
type Eip6963Detail = { info: { uuid: string; name: string; icon: string; rdns: string }; provider: Eip1193 };

declare global {
  interface Window {
    cardano?: Record<string, Cip30Wallet | undefined>;
    phantom?: { solana?: SolanaProvider & { isPhantom?: boolean } };
    solflare?: SolanaProvider & { isSolflare?: boolean };
    okxwallet?: Eip1193 & { solana?: SolanaProvider };
    ethereum?: Eip1193 & { isMetaMask?: boolean; isOkxWallet?: boolean };
  }
}

export type WalletOption = { id: string; chain: Chain; name: string; icon: string | null };

// EIP-6963: every Ethereum wallet announces itself, so several can coexist (OKX, MetaMask, Rabby).
const evmProviders = new Map<string, Eip6963Detail>();
if (typeof window !== "undefined") {
  window.addEventListener("eip6963:announceProvider", (e) => {
    const detail = (e as CustomEvent<Eip6963Detail>).detail;
    if (detail?.info?.uuid) evmProviders.set(detail.info.uuid, detail);
  });
}

/** Ask Ethereum wallets to announce themselves. Call on mount, then read detectWallets() a moment later. */
export function requestEvmWallets() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("eip6963:requestProvider"));
}

export function detectWallets(): WalletOption[] {
  if (typeof window === "undefined") return [];
  const found: WalletOption[] = [];

  // Cardano: every CIP-30 wallet the browser exposes, whatever its key (lace, eternl, okxwallet, ...).
  const seenCardano = new Set<string>();
  for (const [key, w] of Object.entries(window.cardano ?? {})) {
    if (!w || typeof w !== "object" || typeof w.enable !== "function") continue;
    const name = w.name || key;
    if (seenCardano.has(name.toLowerCase())) continue;
    seenCardano.add(name.toLowerCase());
    found.push({ id: `cardano:${key}`, chain: "cardano", name, icon: w.icon || null });
  }

  // Ethereum: announced providers first, then the injected fallbacks.
  for (const { info } of evmProviders.values()) {
    found.push({ id: `ethereum:6963:${info.uuid}`, chain: "ethereum", name: info.name, icon: info.icon || null });
  }
  if (evmProviders.size === 0) {
    if (window.okxwallet) found.push({ id: "ethereum:okx", chain: "ethereum", name: "OKX Wallet", icon: null });
    else if (window.ethereum) found.push({ id: "ethereum:injected", chain: "ethereum", name: window.ethereum.isMetaMask ? "MetaMask" : "Browser wallet", icon: null });
  }

  // Solana
  if (window.phantom?.solana?.isPhantom) found.push({ id: "solana:phantom", chain: "solana", name: "Phantom", icon: null });
  if (window.solflare?.isSolflare) found.push({ id: "solana:solflare", chain: "solana", name: "Solflare", icon: null });
  if (window.okxwallet?.solana) found.push({ id: "solana:okx", chain: "solana", name: "OKX Wallet (Solana)", icon: null });
  return found;
}

const toHex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

export type ConnectedWallet = {
  chain: Chain;
  /** Every address the wallet exposes; the app signs with the one Strike knows, when there is one. */
  addresses: string[];
  sign(address: string, message: string): Promise<{ signature: string; key?: string }>;
};

function solanaProvider(key: string): SolanaProvider | undefined {
  if (key === "phantom") return window.phantom?.solana;
  if (key === "solflare") return window.solflare;
  if (key === "okx") return window.okxwallet?.solana;
  return undefined;
}

function evmProvider(id: string): Eip1193 | undefined {
  if (id.startsWith("ethereum:6963:")) return evmProviders.get(id.slice("ethereum:6963:".length))?.provider;
  if (id === "ethereum:okx") return window.okxwallet;
  return window.ethereum;
}

export async function connectWallet(option: WalletOption): Promise<ConnectedWallet> {
  const chain = option.chain;
  const key = option.id.slice(option.id.indexOf(":") + 1);

  if (chain === "cardano") {
    const wallet = window.cardano?.[key];
    if (!wallet?.enable) throw new Error(`${option.name} is not available in this browser`);
    const api = await wallet.enable();
    const used = await api.getUsedAddresses().catch(() => [] as string[]);
    const change = await api.getChangeAddress().catch(() => null);
    const addresses = [...new Set([...used, ...(change ? [change] : [])])];
    if (addresses.length === 0) throw new Error(`${option.name} did not share an address`);
    return { chain, addresses, sign: (address, message) => api.signData(address, toHex(new TextEncoder().encode(message))) };
  }

  if (chain === "ethereum") {
    const provider = evmProvider(option.id);
    if (!provider) throw new Error(`${option.name} is not available in this browser`);
    const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
    if (!accounts?.length) throw new Error(`${option.name} did not share an address`);
    return {
      chain,
      addresses: accounts,
      sign: async (address, message) => ({
        signature: (await provider.request({ method: "personal_sign", params: [`0x${toHex(new TextEncoder().encode(message))}`, address] })) as string,
      }),
    };
  }

  const provider = solanaProvider(key);
  if (!provider) throw new Error(`${option.name} is not available in this browser`);
  const { publicKey } = await provider.connect();
  return {
    chain,
    addresses: [publicKey.toBase58()],
    sign: async (_address, message) => {
      const out = await provider.signMessage(new TextEncoder().encode(message), "utf8");
      const bytes = out instanceof Uint8Array ? out : out.signature;
      return { signature: base58.encode(bytes) };
    },
  };
}
