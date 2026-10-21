import Link from "next/link";
import { Container } from "@/components/primitives";

export const REPO_URL = "https://github.com/mikemoulder/draft-week";

export function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ground">
      <Container className="flex h-16 items-center justify-between gap-6">
        <Link href="/" className="t-title font-extrabold tracking-tight [font-stretch:125%]">
          DRAFT WEEK
        </Link>
        <nav className="hidden items-center gap-8 md:flex" aria-label="Main">
          <a href="#scoring" className="t-label text-fg-mute hover:text-fg">
            Scoring
          </a>
          <a href="#game" className="t-label text-fg-mute hover:text-fg">
            Last week
          </a>
          <a href={REPO_URL} className="t-label text-fg-mute hover:text-fg" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </nav>
        <Link href="/play" className="btn btn-action btn-sm">
          Play now
        </Link>
      </Container>
    </header>
  );
}
