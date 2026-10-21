import { ArrowsClockwise, Code, Database, EyeSlash } from "@phosphor-icons/react/dist/ssr";
import type { ShowcaseStats } from "@draftweek/shared";
import { Container } from "@/components/primitives";
import { Since } from "@/components/since";

export function Trust({ stats, live }: { stats: ShowcaseStats; live: boolean }) {
  const rows = [
    { icon: Database, k: "Real trades", v: "Every point comes from Strike Finance's public trade history. Nothing is generated or estimated." },
    {
      icon: ArrowsClockwise,
      k: "Fresh",
      v: live ? (
        <>
          Refreshed every five minutes. Last update <Since at={stats.lastIngestAt} />.
        </>
      ) : (
        "Showing a saved snapshot while the live feed is unavailable."
      ),
    },
    { icon: EyeSlash, k: "Fair draft", v: "Cards are rated on last week, never the week being played, so nobody drafts with hindsight." },
    { icon: Code, k: "Open rules", v: "The scoring is open source and tested. The same week always scores the same way." },
  ];
  return (
    <section className="theme-bone bg-ground py-[var(--section-y)] text-fg">
      <Container className="grid gap-12 md:grid-cols-[5fr_7fr]">
        <h2 className="t-display-l max-w-[10ch]">Nothing here is simulated.</h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {rows.map(({ icon: Icon, k, v }) => (
            <li key={k} className="rounded-panel bg-panel p-6 shadow-[0_12px_30px_-18px_rgb(40_24_60_/_0.35)]">
              <Icon size={28} weight="duotone" className="text-[#ff7a3d]" aria-hidden />
              <p className="t-title mt-4">{k}</p>
              <p className="t-body mt-1 text-fg-mute">{v}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
