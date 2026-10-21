import { GithubLogo, Lightning } from "@phosphor-icons/react/dist/ssr";
import { Container } from "@/components/primitives";
import { REPO_URL } from "./nav";

export function Footer() {
  return (
    <footer className="overflow-hidden border-t border-line">
      <Container className="flex flex-col gap-4 py-8 md:flex-row md:items-center md:justify-between">
        <p className="t-small text-fg-mute">Data from Strike Finance&apos;s public API. Not affiliated with Strike Finance.</p>
        <nav className="flex flex-wrap items-center gap-6" aria-label="Footer">
          <a href={REPO_URL} className="inline-flex items-center gap-1.5 t-small font-semibold text-fg-mute hover:text-fg" target="_blank" rel="noreferrer">
            <GithubLogo size={16} weight="duotone" aria-hidden /> GitHub
          </a>
          <a href="https://strikefinance.org" className="inline-flex items-center gap-1.5 t-small font-semibold text-fg-mute hover:text-fg" target="_blank" rel="noreferrer">
            <Lightning size={16} weight="duotone" aria-hidden /> Strike Finance
          </a>
          <span className="t-small text-fg-faint">Built for the Strike Hackathon 2026</span>
        </nav>
      </Container>
      <p
        aria-hidden
        className="t-num -mb-[0.28em] select-none text-center text-[34vw] leading-[0.8] tracking-[-0.05em] text-surface-2"
      >
        FTL
      </p>
    </footer>
  );
}
