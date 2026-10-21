"use client";

import Link from "next/link";
import { useSession } from "@/components/session";

export function AccountBar() {
  const { me, loading, signOut } = useSession();
  if (loading) return null;
  if (!me) {
    return (
      <Link href="/signin" className="text-sm font-medium underline underline-offset-4">
        Sign in with your wallet
      </Link>
    );
  }
  return (
    <p className="flex items-center gap-3 text-sm">
      Signed in as <span className="font-mono">{me.displayName}</span>
      <button type="button" onClick={() => void signOut()} className="underline underline-offset-4">
        Sign out
      </button>
    </p>
  );
}
