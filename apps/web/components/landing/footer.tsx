import { Container } from "@/components/primitives";
import { REPO_URL } from "./nav";

export function Footer() {
  return (
    <footer className="overflow-hidden border-t border-line-strong">
      <Container className="flex flex-col gap-4 py-8 md:flex-row md:items-center md:justify-between">
        <p className="t-small text-fg-mute">Data from Strike Finance&apos;s public API. Not affiliated with Strike Finance.</p>
        <nav className="flex flex-wrap gap-6" aria-label="Footer">
          <a href={REPO_URL} className="t-label text-fg-mute hover:text-fg" target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a href="https://strikefinance.org" className="t-label text-fg-mute hover:text-fg" target="_blank" rel="noreferrer">
            Strike Finance
          </a>
          <span className="t-label">Built for the Strike Hackathon 2026</span>
        </nav>
      </Container>
      <p
        aria-hidden
        className="t-num -mb-[0.3em] select-none whitespace-nowrap text-center text-[36vw] leading-[0.78] tracking-[-0.06em] text-surface-2"
      >
        FTL
      </p>
    </footer>
  );
}
