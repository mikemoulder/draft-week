import type { ShowcaseStats } from "@draftweek/shared";
import { Container } from "@/components/primitives";
import { Since } from "@/components/since";

export function Trust({ stats, live }: { stats: ShowcaseStats; live: boolean }) {
  const rows = [
    { k: "Source", v: "Every fill comes from Strike Finance's public trade history. Nothing is generated or estimated." },
    {
      k: "Freshness",
      v: live ? (
        <>
          Refreshed every five minutes. Last update <Since at={stats.lastIngestAt} />.
        </>
      ) : (
        "Showing a saved snapshot while the live feed is unavailable."
      ),
    },
    { k: "Fair draft", v: "Trader cards show last week, never the week being played, so nobody drafts with hindsight." },
    { k: "Rules", v: "The scoring rules are code, open and tested. The same week always scores the same way." },
  ];
  return (
    <section className="theme-bone bg-ground py-[var(--section-y)] text-fg">
      <Container className="grid gap-10 md:grid-cols-[5fr_7fr]">
        <h2 className="t-display-l max-w-[10ch]">Nothing here is simulated.</h2>
        <dl className="border-t border-line-strong">
          {rows.map((r) => (
            <div key={r.k} className="grid gap-2 border-b border-line py-5 md:grid-cols-[160px_1fr]">
              <dt className="t-label text-fg-mute">{r.k}</dt>
              <dd className="t-body">{r.v}</dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}
