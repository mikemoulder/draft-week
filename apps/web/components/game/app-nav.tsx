"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Container } from "@/components/primitives";
import { useSession } from "@/components/session";

export function AppNav() {
  const { me, loading, signOut } = useSession();
  const router = useRouter();
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ground">
      <Container className="flex h-16 items-center justify-between gap-6">
        <Link href="/" className="flex items-baseline gap-3" aria-label="FTL, Fantasy Trading League, home">
          <span className="t-title font-extrabold tracking-tight [font-stretch:125%]">FTL</span>
          <span className="t-label hidden text-fg-mute sm:inline">Fantasy Trading League</span>
        </Link>
        {loading ? null : me ? (
          <div className="flex items-center gap-5">
            <Link href="/play" className="t-label hidden text-fg-mute hover:text-fg sm:inline">
              My leagues
            </Link>
            <span className="t-label max-w-[18ch] truncate text-fg-soft">{me.displayName}</span>
            <button
              type="button"
              className="t-label text-fg-mute hover:text-fg"
              onClick={async () => {
                await signOut();
                router.push("/");
              }}
            >
              Sign out
            </button>
          </div>
        ) : (
          <Link href="/signin" className="btn btn-action btn-sm">
            Sign in
          </Link>
        )}
      </Container>
    </header>
  );
}
