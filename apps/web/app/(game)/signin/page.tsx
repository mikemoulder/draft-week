"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, ArrowsClockwise, ArrowSquareOut, UserCircle, Wallet, WarningCircle } from "@phosphor-icons/react";
import type { Chain } from "@draftweek/shared";
import { CHAIN_LABEL, ChainMark } from "@/components/chain-mark";
import { Container, cx } from "@/components/primitives";
import { useSession } from "@/components/session";
import { detectWallets, requestEvmWallets, type WalletOption } from "@/lib/wallets";

const STRIKE_APP = "https://app.strikefinance.org";
const CHAINS: Chain[] = ["cardano", "ethereum", "solana"];
const EXAMPLES: Record<Chain, string> = {
  cardano: "Lace, Eternl, Vespr, OKX",
  ethereum: "MetaMask, Rabby, OKX, Coinbase",
  solana: "Phantom, Solflare, OKX",
};
const LAST_NETWORK = "ftl.network";

function readLastNetwork(): Chain | null {
  try {
    const v = localStorage.getItem(LAST_NETWORK);
    return v === "cardano" || v === "ethereum" || v === "solana" ? v : null;
  } catch {
    return null;
  }
}

function SignIn() {
  const { signIn, playAsGuest } = useSession();
  const router = useRouter();
  const raw = useSearchParams().get("next") ?? "/play";
  const next = raw.startsWith("/") ? raw : "/play";
  const [wallets, setWallets] = useState<WalletOption[] | null>(null);
  // Step 1 picks the network the Strike account lives on; step 2 picks a wallet on it.
  const [network, setNetwork] = useState<Chain | null>(null);
  const [last, setLast] = useState<Chain | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Signed in, but the wallet has no Strike account on that network: offer another network or sign-up.
  const [noStrike, setNoStrike] = useState<WalletOption | null>(null);

  // Extensions inject themselves after load and Ethereum wallets answer an announcement request,
  // so look again shortly after mounting.
  useEffect(() => {
    requestEvmWallets();
    const now = setTimeout(() => {
      setWallets(detectWallets());
      setLast(readLastNetwork());
    }, 0);
    const later = setTimeout(() => setWallets(detectWallets()), 800);
    return () => {
      clearTimeout(now);
      clearTimeout(later);
    };
  }, []);

  function pickNetwork(chain: Chain | null) {
    setNetwork(chain);
    setError(null);
    if (chain) {
      setLast(chain);
      try {
        localStorage.setItem(LAST_NETWORK, chain);
      } catch {
        /* private mode: nothing to remember */
      }
    }
  }

  async function choose(option: WalletOption) {
    setBusy(option.id);
    setError(null);
    try {
      const me = await signIn(option);
      if (me.strike) router.push(next);
      else setNoStrike(option);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed. Try again.");
    } finally {
      setBusy(null);
    }
  }

  async function guest() {
    setBusy("guest");
    setError(null);
    try {
      await playAsGuest();
      router.push(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start a guest session.");
      setBusy(null);
    }
  }

  if (noStrike) {
    const others = CHAINS.filter((c) => c !== noStrike.chain);
    return (
      <Container className="max-w-[720px] py-16 md:py-24">
        <div className="rounded-panel border border-line bg-tile p-7 md:p-10">
          <WarningCircle size={40} weight="duotone" className="text-warning" aria-hidden />
          <h1 className="t-display-m mt-5">No Strike account on {CHAIN_LABEL[noStrike.chain]} for this wallet</h1>
          <p className="t-body mt-3 text-fg-mute">
            Strike accounts belong to one network. If you signed up on Strike with {others.map((c) => CHAIN_LABEL[c]).join(" or ")}, sign in
            with that network instead. Otherwise create a Strike account with this wallet: it gives you a bigger budget for trading on
            Strike, and lets you copy the traders you pick.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button
              type="button"
              className="btn btn-action btn-lg"
              onClick={() => {
                setNoStrike(null);
                pickNetwork(null);
              }}
            >
              <ArrowsClockwise size={17} weight="bold" aria-hidden /> Try another network
            </button>
            <a href={STRIKE_APP} target="_blank" rel="noreferrer" className="btn btn-ghost btn-lg">
              Create a Strike account <ArrowSquareOut size={17} weight="bold" aria-hidden />
            </a>
          </div>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
            <button type="button" className="t-small text-fg-mute underline underline-offset-4 hover:text-fg" disabled={busy !== null} onClick={() => choose(noStrike)}>
              {busy ? "Checking…" : "I've just signed up, check again"}
            </button>
            <button type="button" className="t-small text-fg-mute underline underline-offset-4 hover:text-fg" onClick={() => router.push(next)}>
              Continue without a Strike account (no trading bonus)
            </button>
          </div>
        </div>
      </Container>
    );
  }

  const onNetwork = (chain: Chain) => (wallets ?? []).filter((w) => w.chain === chain);

  return (
    <Container className="grid gap-12 py-16 md:grid-cols-[5fr_6fr] md:py-24">
      <div>
        <p className="t-label">Sign in</p>
        <h1 className="t-display-l mt-4 max-w-[12ch]">{network ? `Pick your ${CHAIN_LABEL[network]} wallet.` : "Where is your Strike account?"}</h1>
        <p className="t-lead mt-6 max-w-[440px]">
          {network
            ? "Use the wallet you trade with on Strike. Signing a message is free and never moves funds. Your leagues follow the wallet to any device."
            : "Strike accounts live on Cardano, Ethereum or Solana. Pick the network of the wallet you signed up to Strike with, so FTL loads the right account."}
        </p>
      </div>

      <div className="flex flex-col gap-8">
        {network === null ? (
          <div>
            <p className="t-label mb-3">Network</p>
            <ul className="flex flex-col gap-2">
              {CHAINS.map((chain) => {
                const found = onNetwork(chain).length;
                return (
                  <li key={chain}>
                    <button
                      type="button"
                      onClick={() => pickNetwork(chain)}
                      className="flex w-full items-center gap-4 rounded-tile border border-line bg-tile px-4 py-4 text-left transition-colors hover:border-line-strong"
                    >
                      <span className="grid size-11 place-items-center rounded-full bg-fill text-fg">
                        <ChainMark chain={chain} size={26} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="t-title flex items-center gap-2">
                          {CHAIN_LABEL[chain]}
                          {last === chain ? <span className="t-label rounded-chip bg-fill px-2 py-0.5 text-[10px]">Last used</span> : null}
                        </span>
                        <span className="t-small block text-fg-mute">{EXAMPLES[chain]}</span>
                      </span>
                      <span className={cx("t-label", found ? "text-success" : "text-fg-mute")}>
                        {wallets === null ? "" : found ? `${found} found` : "None found"}
                      </span>
                      <ArrowRight size={18} className="text-fg-mute" aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="t-small mt-4 text-fg-mute">
              Not sure? Open Strike and check the address shown on your account: <span className="font-mono">addr1…</span> is Cardano,{" "}
              <span className="font-mono">0x…</span> is Ethereum, anything else is Solana.
            </p>
          </div>
        ) : (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="t-label inline-flex items-center gap-2">
                <ChainMark chain={network} size={16} /> {CHAIN_LABEL[network]} wallets in this browser
              </p>
              <button type="button" className="t-small inline-flex items-center gap-1 text-fg-mute hover:text-fg" onClick={() => pickNetwork(null)} disabled={busy !== null}>
                <ArrowLeft size={14} aria-hidden /> Change network
              </button>
            </div>
            {wallets === null ? (
              <div className="skeleton h-14" />
            ) : onNetwork(network).length === 0 ? (
              <p className="rounded-tile border border-line p-5 t-body text-fg-mute">
                No {CHAIN_LABEL[network]} wallet found. Install one ({EXAMPLES[network]}), unlock it, then reload this page.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {onNetwork(network).map((w) => (
                  <li key={w.id}>
                    <button
                      type="button"
                      onClick={() => choose(w)}
                      disabled={busy !== null}
                      className={cx(
                        "flex w-full items-center gap-4 rounded-tile border border-line bg-tile px-4 py-3.5 text-left transition-colors hover:border-line-strong disabled:opacity-60",
                        busy === w.id && "border-line-strong",
                      )}
                    >
                      {/* Wallet icons are data URIs injected by the extension; next/image cannot optimise them. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {w.icon ? <img src={w.icon} alt="" className="size-8 rounded-[8px]" /> : <Wallet size={32} weight="duotone" className="text-fg-mute" aria-hidden />}
                      <span className="t-title flex-1">{w.name.replace(/ \((Solana|Ethereum|Cardano)\)$/, "").replace(/^\w/, (c) => c.toUpperCase())}</span>
                      <span className="t-label">{busy === w.id ? "Check your wallet" : ""}</span>
                      <ArrowRight size={18} className="text-fg-mute" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {network === null ? (
          <div className="border-t border-line pt-6">
            <p className="t-label mb-3">No wallet with you</p>
            <button type="button" className="btn btn-ghost w-full" disabled={busy !== null} onClick={guest}>
              <UserCircle size={18} weight="duotone" aria-hidden /> {busy === "guest" ? "Setting up…" : "Play as a guest"}
            </button>
            <p className="t-small mt-3 text-fg-mute">A guest account lives in this browser only and gets no trading bonus.</p>
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="rounded-tile border border-danger bg-danger-soft p-4 t-body text-danger">
            {error}
          </p>
        ) : null}
      </div>
    </Container>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignIn />
    </Suspense>
  );
}
