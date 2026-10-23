"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";
import { ManagerAvatar } from "@/components/manager-avatar";
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
            <Link
              href="/profile"
              className="rounded-full ring-2 ring-line-strong transition-shadow hover:ring-action focus-visible:ring-action"
              aria-label={`Your profile, ${me.displayName}`}
              title={me.displayName}
            >
              <ManagerAvatar me={me} />
            </Link>
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
