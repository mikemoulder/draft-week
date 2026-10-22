"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { ChallengeResponse, Me, StrikeAccount } from "@draftweek/shared";
import { ApiError, api } from "@/lib/api";
import { connectWallet, type WalletOption } from "@/lib/wallets";

type Session = {
  me: Me | null;
  loading: boolean;
  signIn(option: WalletOption): Promise<Me>;
  playAsGuest(): Promise<Me>;
  signOut(): Promise<void>;
};

const SessionContext = createContext<Session | null>(null);

// Wallets report a cancelled prompt in different shapes; normalise the common ones.
function walletErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  const e = err as { code?: number; info?: string; message?: string } | null;
  if (e?.code === 3 || e?.code === -3 || e?.code === 4001 || /declin|reject|cancel/i.test(e?.info ?? e?.message ?? "")) {
    return "You cancelled the request in your wallet.";
  }
  return e?.info ?? e?.message ?? "Something went wrong talking to your wallet.";
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Me | null>("/me")
      .then(setMe)
      .catch(() => setMe(null))
      .finally(() => setLoading(false));
  }, []);

  const signIn = useCallback(async (option: WalletOption) => {
    try {
      const wallet = await connectWallet(option);
      // Sign with the address Strike knows, so the session links to the user's Strike account.
      const known = await api.post<StrikeAccount[]>("/strike/accounts", { chain: wallet.chain, addresses: wallet.addresses.slice(0, 20) }).catch(() => []);
      const address = known[0]?.input ?? wallet.addresses[0] ?? "";
      const challenge = await api.post<ChallengeResponse>("/auth/challenge", { chain: wallet.chain, address });
      const signed = await wallet.sign(address, challenge.message);
      const user = await api.post<Me>("/auth/verify", { nonce: challenge.nonce, ...signed });
      setMe(user);
      return user;
    } catch (err) {
      throw new Error(walletErrorMessage(err));
    }
  }, []);

  const playAsGuest = useCallback(async () => {
    const user = await api.post<Me>("/auth/guest");
    setMe(user);
    return user;
  }, []);

  const signOut = useCallback(async () => {
    await api.post("/auth/logout");
    setMe(null);
  }, []);

  return <SessionContext.Provider value={{ me, loading, signIn, playAsGuest, signOut }}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
