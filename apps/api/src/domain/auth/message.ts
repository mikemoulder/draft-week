import type { Chain } from "@draftweek/shared";

const CHAIN_NAME: Record<Chain, string> = { cardano: "Cardano", solana: "Solana", ethereum: "Ethereum" };

export type MessageFields = {
  origin: string;
  chain: Chain;
  address: string;
  nonce: string;
  issuedAt: Date;
  expiresAt: Date;
};

// Shaped after EIP-4361 (Sign-In with Ethereum) so wallets show a readable, familiar prompt.
// The domain line stops a signature for another site being replayed here.
export function buildMessage(f: MessageFields): string {
  const url = new URL(f.origin);
  return [
    `${url.host} wants you to sign in with your ${CHAIN_NAME[f.chain]} account:`,
    f.address,
    "",
    "Sign in to Draft Week. This does not cost anything or move any funds.",
    "",
    `URI: ${url.origin}`,
    `Nonce: ${f.nonce}`,
    `Issued At: ${f.issuedAt.toISOString()}`,
    `Expiration Time: ${f.expiresAt.toISOString()}`,
  ].join("\n");
}
