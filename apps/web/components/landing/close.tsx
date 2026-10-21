import Link from "next/link";
import { ArrowRight, Wallet, UserCircle } from "@phosphor-icons/react/dist/ssr";
import { Container } from "@/components/primitives";

export function Close() {
  return (
    <section className="floodlight overflow-hidden py-[calc(var(--section-y)*1.2)] text-center">
      <Container>
        <h2 className="t-display-l mx-auto max-w-[14ch]">Draft night is tonight.</h2>
        <p className="t-lead mx-auto mt-6 max-w-[520px]">Pick a week, draft your five, and send the invite code to your group chat.</p>
        <div className="mt-10 flex justify-center">
          <Link href="/play" className="btn btn-action btn-lg">
            Start a league <ArrowRight size={17} weight="bold" aria-hidden />
          </Link>
        </div>
        <p className="t-small mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-fg-mute">
          <span className="inline-flex items-center gap-1.5">
            <Wallet size={16} weight="duotone" aria-hidden /> Sign in with your Strike wallet
          </span>
          <span className="inline-flex items-center gap-1.5">
            <UserCircle size={16} weight="duotone" aria-hidden /> or play as a guest
          </span>
        </p>
      </Container>
    </section>
  );
}
