"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Container, cx } from "@/components/primitives";
import { useSession } from "@/components/session";
import { detectWallets, type WalletOption } from "@/lib/wallets";

function SignIn() {
  const { signIn, playAsGuest } = useSession();
  const router = useRouter();
  const next = useSearchParams().get("next") ?? "/play";
  const [wallets, setWallets] = useState<WalletOption[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Wallet extensions inject themselves after load, so look again shortly after mounting.
  useEffect(() => {
    const now = setTimeout(() => setWallets(detectWallets()), 0);
    const later = setTimeout(() => setWallets(detectWallets()), 700);
    return () => {
      clearTimeout(now);
      clearTimeout(later);
    };
  }, []);

  async function run(id: string, action: () => Promise<unknown>) {
    setBusy(id);
    setError(null);
    try {
      await action();
      router.push(next.startsWith("/") ? next : "/play");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed. Try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Container className="grid gap-12 py-16 md:grid-cols-[5fr_6fr] md:py-24">
      <div>
        <p className="t-label">Sign in</p>
        <h1 className="t-display-l mt-4 max-w-[10ch]">Pick your wallet.</h1>
        <p className="t-lead mt-6 max-w-[440px]">
          Use the wallet you trade with on Strike. Signing a message is free and never moves funds. Your leagues follow
          the wallet to any device.
        </p>
      </div>

      <div className="flex flex-col gap-8">
        <div>
          <p className="t-label mb-3">Wallets in this browser</p>
          {wallets === null ? (
            <div className="skeleton h-14" />
          ) : wallets.length === 0 ? (
            <p className="border border-line p-5 t-body text-fg-mute">
              No wallet found. Install Lace or Eternl for Cardano, or Phantom for Solana, then reload this page.
            </p>
          ) : (
            <ul className="border-t border-line">
              {wallets.map((w) => (
                <li key={w.id}>
                  <button
                    type="button"
                    onClick={() => run(w.id, () => signIn(w))}
                    disabled={busy !== null}
                    className={cx(
                      "flex w-full items-center gap-4 border-b border-line px-1 py-4 text-left transition-colors hover:bg-fill disabled:opacity-60",
                      busy === w.id && "bg-fill",
                    )}
                  >
                    {/* Wallet icons are data URIs injected by the extension; next/image cannot optimise them. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {w.icon ? <img src={w.icon} alt="" className="size-7" /> : <span className="size-7 bg-surface-2" />}
                    <span className="t-title flex-1">{w.name}</span>
                    <span className="t-label">{busy === w.id ? "Check your wallet" : w.chain}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-line-strong pt-6">
          <p className="t-label mb-3">No wallet with you</p>
          <button
            type="button"
            className="btn btn-ghost w-full"
            disabled={busy !== null}
            onClick={() => run("guest", playAsGuest)}
          >
            {busy === "guest" ? "Setting up…" : "Play as a guest"}
          </button>
          <p className="t-small mt-3 text-fg-mute">A guest account lives in this browser only. Sign in with a wallet to keep your leagues everywhere.</p>
        </div>

        {error ? (
          <p role="alert" className="border border-danger bg-danger-soft p-4 t-body text-danger">
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
