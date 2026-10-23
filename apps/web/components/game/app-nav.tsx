"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";
import { Container } from "@/components/primitives";
import { useSession } from "@/components/session";

export function AppNav() {
  const { me, loading, signOut } = useSession();
  const router = useRouter();
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-glass backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between gap-6">
        <Logo />
        {loading ? null : me ? (
          <div className="flex items-center gap-5">
            <Link href="/how-it-works" className="t-label hidden text-fg-mute hover:text-fg md:inline">
              How it works
            </Link>
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
          <div className="flex items-center gap-5">
            <Link href="/how-it-works" className="t-label hidden text-fg-mute hover:text-fg sm:inline">
              How it works
            </Link>
            <Link href="/signin" className="btn btn-action btn-sm">
              Sign in
            </Link>
          </div>
        )}
      </Container>
    </header>
  );
}
