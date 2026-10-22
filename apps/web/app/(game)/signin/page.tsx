"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, ArrowsClockwise, ArrowSquareOut, UserCircle, Wallet, WarningCircle } from "@phosphor-icons/react";
import { Container, cx } from "@/components/primitives";
import { useSession } from "@/components/session";
import { detectWallets, requestEvmWallets, type WalletOption } from "@/lib/wallets";

const STRIKE_APP = "https://app.strikefinance.org";
const CHAIN_LABEL = { cardano: "Cardano", ethereum: "Ethereum", solana: "Solana" } as const;

function SignIn() {
  const { signIn, playAsGuest } = useSession();
  const router = useRouter();
  const raw = useSearchParams().get("next") ?? "/play";
  const next = raw.startsWith("/") ? raw : "/play";
  const [wallets, setWallets] = useState<WalletOption[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Signed in, but the wallet has no Strike account: offer to create one before going on.
  const [noStrike, setNoStrike] = useState<WalletOption | null>(null);

  // Extensions inject themselves after load and Ethereum wallets answer an announcement request,
  // so look again shortly after mounting.
  useEffect(() => {
    requestEvmWallets();
    const now = setTimeout(() => setWallets(detectWallets()), 0);
    const later = setTimeout(() => setWallets(detectWallets()), 800);
    return () => {
      clearTimeout(now);
      clearTimeout(later);
    };
  }, []);

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
    return (
      <Container className="max-w-[720px] py-16 md:py-24">
        <div className="rounded-panel border border-line bg-tile p-7 md:p-10">
          <WarningCircle size={40} weight="duotone" className="text-warning" aria-hidden />
          <h1 className="t-display-m mt-5">This wallet has no Strike account yet</h1>
          <p className="t-body mt-3 text-fg-mute">
            FTL is built on Strike Finance. With a Strike account you get a bigger budget for trading on Strike, and you can
            copy the traders you pick. Create one with the same {CHAIN_LABEL[noStrike.chain]} wallet, then come back.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href={STRIKE_APP} target="_blank" rel="noreferrer" className="btn btn-action btn-lg">
              Create a Strike account <ArrowSquareOut size={17} weight="bold" aria-hidden />
            </a>
            <button type="button" className="btn btn-ghost btn-lg" disabled={busy !== null} onClick={() => choose(noStrike)}>
              <ArrowsClockwise size={17} weight="bold" aria-hidden /> {busy ? "Checking…" : "I've signed up, check again"}
            </button>
          </div>
          <button type="button" className="t-small mt-6 text-fg-mute underline underline-offset-4 hover:text-fg" onClick={() => router.push(next)}>
            Continue without a Strike account (no trading bonus)
          </button>
        </div>
      </Container>
    );
  }

  return (
    <Container className="grid gap-12 py-16 md:grid-cols-[5fr_6fr] md:py-24">
      <div>
        <p className="t-label">Sign in</p>
        <h1 className="t-display-l mt-4 max-w-[10ch]">Pick your wallet.</h1>
        <p className="t-lead mt-6 max-w-[440px]">
          Use the wallet you trade with on Strike: Cardano, Ethereum or Solana. Signing a message is free and never moves
          funds. Your leagues follow the wallet to any device.
        </p>
      </div>

      <div className="flex flex-col gap-8">
        <div>
          <p className="t-label mb-3">Wallets in this browser</p>
          {wallets === null ? (
            <div className="skeleton h-14" />
          ) : wallets.length === 0 ? (
            <p className="rounded-tile border border-line p-5 t-body text-fg-mute">
              No wallet found. Install Lace, Eternl, OKX Wallet, MetaMask or Phantom, then reload this page.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {wallets.map((w) => (
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
                    <span className="t-title flex-1">{w.name}</span>
                    <span className="t-label">{busy === w.id ? "Check your wallet" : CHAIN_LABEL[w.chain]}</span>
                    <ArrowRight size={18} className="text-fg-mute" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-line pt-6">
          <p className="t-label mb-3">No wallet with you</p>
          <button type="button" className="btn btn-ghost w-full" disabled={busy !== null} onClick={guest}>
            <UserCircle size={18} weight="duotone" aria-hidden /> {busy === "guest" ? "Setting up…" : "Play as a guest"}
          </button>
          <p className="t-small mt-3 text-fg-mute">A guest account lives in this browser only and gets no trading bonus.</p>
        </div>

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
