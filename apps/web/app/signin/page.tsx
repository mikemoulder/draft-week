"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/session";
import { detectWallets, type WalletOption } from "@/lib/wallets";

export default function SignInPage() {
  const { signIn } = useSession();
  const router = useRouter();
  const [wallets, setWallets] = useState<WalletOption[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Extensions inject themselves after page load, so look again shortly after mounting.
  useEffect(() => {
    const now = setTimeout(() => setWallets(detectWallets()), 0);
    const later = setTimeout(() => setWallets(detectWallets()), 600);
    return () => {
      clearTimeout(now);
      clearTimeout(later);
    };
  }, []);

  async function choose(option: WalletOption) {
    setBusy(option.id);
    setError(null);
    try {
      await signIn(option);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-24">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Use the wallet you trade with on Strike. Signing in is free and never moves funds.
        </p>
      </div>

      {wallets === null ? null : wallets.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No wallet found in this browser. Install Lace or Eternl for Cardano, or Phantom for Solana, then reload.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {wallets.map((w) => (
            <li key={w.id}>
              <button
                type="button"
                onClick={() => choose(w)}
                disabled={busy !== null}
                className="flex w-full items-center gap-3 rounded-md border border-zinc-300 px-4 py-3 text-left hover:border-zinc-500 disabled:opacity-60 dark:border-zinc-700"
              >
                {/* Wallet icons are data URIs injected by the extension; next/image cannot optimise them. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {w.icon ? <img src={w.icon} alt="" className="h-6 w-6" /> : null}
                <span className="flex-1 font-medium">{w.name}</span>
                <span className="text-xs uppercase tracking-wide text-zinc-500">{w.chain}</span>
                {busy === w.id ? <span className="text-xs text-zinc-500">Check your wallet…</span> : null}
              </button>
            </li>
          ))}
        </ul>
      )}

      {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
    </main>
  );
}
