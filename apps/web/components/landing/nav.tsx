import Link from "next/link";
import { ArrowRight, GithubLogo, Trophy, Ticket } from "@phosphor-icons/react/dist/ssr";
import { Container } from "@/components/primitives";
import { Logo } from "@/components/logo";

export const REPO_URL = "https://github.com/mikemoulder/draft-week";

export function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-glass backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between gap-6">
        <Logo />
        <nav className="hidden items-center gap-7 md:flex" aria-label="Main">
          <a href="#scoring" className="flex items-center gap-1.5 t-small font-semibold text-fg-mute hover:text-fg">
            <Ticket size={16} weight="duotone" aria-hidden /> How scoring works
          </a>
          <a href="#game" className="flex items-center gap-1.5 t-small font-semibold text-fg-mute hover:text-fg">
            <Trophy size={16} weight="duotone" aria-hidden /> Last week&apos;s game
          </a>
          <a href={REPO_URL} className="flex items-center gap-1.5 t-small font-semibold text-fg-mute hover:text-fg" target="_blank" rel="noreferrer">
            <GithubLogo size={16} weight="duotone" aria-hidden /> GitHub
          </a>
        </nav>
        <Link href="/play" className="btn btn-action btn-sm">
          Play now <ArrowRight size={15} weight="bold" aria-hidden />
        </Link>
      </Container>
    </header>
  );
}
