// "Back your squad": copy the picked traders with Strike's own copy trading.
//
// This is the one place browser code calls Strike directly, on purpose. Starting a copy must be
// signed by an API wallet key, and that key is generated here, cannot be exported (WebCrypto,
// extractable: false) and lives only as long as this tab. FTL's servers never see it.
//
// Flow (docs.strikefinance.org/api/builder-codes/builder-connect):
//   1. POST /auth/builder/request-signature   with FTL's builder code and the key's public half
//   2. the user signs Strike's consent message in their wallet
//   3. POST /auth/builder/verify-signature    Strike links the key to the user's account
//   4. POST /v2/copy/subscribe, signed        one per trader
import type { Chain, StrikeAccount } from "@draftweek/shared";
import { api } from "@/lib/api";
import { connectWallet, type ConnectedWallet, type WalletOption } from "@/lib/wallets";

const STRIKE = "https://api.strikefinance.org";
/** FTL's registered builder code (case-sensitive). Public: Strike shows it in the wallet's consent message. */
export const BUILDER_CODE = process.env.NEXT_PUBLIC_FTL_BUILDER_CODE || "FTL";
/** FTL places no orders of its own, so it asks for no builder fee. */
const FEE_SHARE_BPS = 0;

export class StrikeError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function strike<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(STRIKE + path, init);
  const text = await res.text();
  const body = text ? (JSON.parse(text) as { error?: string }) : {};
  if (!res.ok) {
    const msg = body.error ?? `Strike answered ${res.status}`;
    throw new StrikeError(res.status, `Strike: ${msg.charAt(0).toUpperCase()}${msg.slice(1)}.`.replace(/\.\.$/, "."));
  }
  return body as T;
}

export type CopyLimits = { minAmount: number; maxFollowers: number; profitShare: number };

export async function copyLimits(): Promise<CopyLimits> {
  const r = await strike<{ min_copy_amount: string; max_followers_per_lead: number; profit_share_rate: string }>("/v2/copy/lead-traders?limit=1");
  return { minAmount: Number(r.min_copy_amount), maxFollowers: r.max_followers_per_lead, profitShare: Number(r.profit_share_rate) };
}

/** USD the account can still put to work, and the leads it already copies. Public reads. */
export async function copierState(accountId: string): Promise<{ available: number; copying: Set<string> }> {
  const id = encodeURIComponent(accountId);
  const [account, subs] = await Promise.all([
    strike<{ available_balance: string }>(`/v2/account?account_id=${id}`),
    strike<{ subscriptions: { lead_account_id: string; status: string }[] }>(`/v2/copy/subscriptions?account_id=${id}&status=active`),
  ]);
  return {
    available: Number(account.available_balance),
    copying: new Set(subs.subscriptions.filter((s) => s.status === "active").map((s) => s.lead_account_id)),
  };
}

const hex = (bytes: ArrayBuffer | Uint8Array) => Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");

export type Copier = {
  accountId: string;
  subscribe(leadAccountId: string, opts: { amount: number; stopLoss: number }): Promise<void>;
  stop(subscriptionId: string): Promise<void>;
};

// One connection per tab: Back your squad and the profile page share it, so the wallet signs once.
let tabCopier: Copier | null = null;

/**
 * Connects the signed-in wallet to FTL's builder code and returns a copier for this tab.
 * `address` is the wallet address in Strike's form (bech32 on Cardano); `signAs` is the form the
 * wallet itself signs with.
 */
export async function connectCopier(wallet: ConnectedWallet, chain: Chain, address: string, signAs: string): Promise<Copier> {
  if (!BUILDER_CODE) throw new Error("Copying is not set up on this site yet.");
  let keys: CryptoKeyPair;
  try {
    keys = (await crypto.subtle.generateKey({ name: "Ed25519" }, false, ["sign", "verify"])) as CryptoKeyPair;
  } catch {
    throw new Error("This browser cannot create a signing key. Update it, or use Chrome, Firefox or Safari.");
  }
  const publicKey = hex(await crypto.subtle.exportKey("raw", keys.publicKey));

  const challenge = await strike<{ nonce: string; message_to_sign: string }>("/auth/builder/request-signature", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, chain, code: BUILDER_CODE, fee_share_bps: FEE_SHARE_BPS, public_key: publicKey }),
  });
  const signed = await wallet.sign(signAs, challenge.message_to_sign);
  const connected = await strike<{ account_id: string }>("/auth/builder/verify-signature", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nonce: challenge.nonce, wallet_signature: chain === "cardano" ? `${signed.signature}:${signed.key}` : signed.signature }),
  });

  // Signed requests must not be timestamped in the future, so follow Strike's clock.
  const { serverTime } = await strike<{ serverTime: number }>("/v2/time");
  const offset = serverTime - Date.now();

  /** {METHOD}:{PATH}:{TIMESTAMP}:{NONCE}:{SHA-256 of the body}, signed with the tab's key. */
  async function signedFetch<T>(method: "POST" | "DELETE", path: string, payload?: unknown): Promise<T> {
    const body = payload === undefined ? "" : JSON.stringify(payload);
    const timestamp = String(Math.floor((Date.now() + offset) / 1000) - 1);
    const nonce = crypto.randomUUID();
    const bodyHash = hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body)));
    const message = `${method}:${path}:${timestamp}:${nonce}:${bodyHash}`;
    const signature = hex(await crypto.subtle.sign({ name: "Ed25519" }, keys.privateKey, new TextEncoder().encode(message)));
    return strike<T>(path, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        "X-API-Wallet-Public-Key": publicKey,
        "X-API-Wallet-Signature": signature,
        "X-API-Wallet-Timestamp": timestamp,
        "X-API-Wallet-Nonce": nonce,
      },
      body: body || undefined,
    });
  }

  tabCopier = {
    accountId: connected.account_id,
    async subscribe(leadAccountId, { amount, stopLoss }) {
      await signedFetch("POST", "/v2/copy/subscribe", {
        lead_account_id: leadAccountId,
        platform: "strike",
        copy_mode: "fixed_ratio",
        copy_amount: amount.toFixed(2),
        // Never deploy more margin than the amount set aside for this trader.
        max_margin_total: amount.toFixed(2),
        ...(stopLoss > 0 ? { stop_loss_amount: stopLoss.toFixed(2) } : {}),
      });
    },
    async stop(subscriptionId) {
      // Strike closes the copy's positions at market and pays any profit share.
      await signedFetch("DELETE", `/v2/copy/subscribe/${encodeURIComponent(subscriptionId)}`);
    },
  };
  return tabCopier;
}

/** The copier this tab already connected for `accountId`, if any. */
export function existingCopier(accountId: string): Copier | null {
  return tabCopier?.accountId === accountId ? tabCopier : null;
}

/**
 * Connect `option` as the signed-in player: the wallet must hold the Strike account the player
 * signed in with. Reuses this tab's connection when there is one.
 */
export async function copierFor(option: WalletOption, chain: Chain, strikeAccountId: string): Promise<Copier> {
  const existing = existingCopier(strikeAccountId);
  if (existing) return existing;
  const wallet = await connectWallet(option);
  const known = await api.post<StrikeAccount[]>("/strike/accounts", { chain, addresses: wallet.addresses.slice(0, 20) });
  const mine = known.find((k) => k.accountId === strikeAccountId);
  if (!mine) throw new Error("This wallet is not the one you signed in with. Switch accounts in your wallet and try again.");
  return connectCopier(wallet, chain, mine.address, mine.input);
}

export type ActiveCopy = {
  id: string;
  leadAccountId: string;
  leadName: string | null;
  leadAvatarUrl: string | null;
  amount: number;
  pnl: number;
  stopLoss: number | null;
  since: number;
  fills: number;
};

/** The account's running copies, newest first. A public read. */
export async function activeCopies(accountId: string): Promise<ActiveCopy[]> {
  const r = await strike<{
    subscriptions: {
      subscription_id: string;
      lead_account_id: string;
      lead_nickname?: string;
      lead_avatar_url?: string;
      copy_amount?: string;
      pnl?: string;
      stop_loss_amount?: string;
      status: string;
      created_at_ms: number;
      filled_order_count?: number;
    }[];
  }>(`/v2/copy/subscriptions?account_id=${encodeURIComponent(accountId)}&status=active`);
  return r.subscriptions
    .filter((x) => x.status === "active")
    .map((x) => ({
      id: x.subscription_id,
      leadAccountId: x.lead_account_id,
      leadName: x.lead_nickname || null,
      leadAvatarUrl: x.lead_avatar_url ? (x.lead_avatar_url.startsWith("http") ? x.lead_avatar_url : `https://${x.lead_avatar_url}`) : null,
      amount: Number(x.copy_amount ?? 0),
      pnl: Number(x.pnl ?? 0),
      stopLoss: x.stop_loss_amount ? Number(x.stop_loss_amount) : null,
      since: x.created_at_ms,
      fills: x.filled_order_count ?? 0,
    }));
}
