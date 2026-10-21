import { Trophy } from "@phosphor-icons/react/dist/ssr";
import type { Showcase } from "@draftweek/shared";
import { Container } from "@/components/primitives";
import { ReplayScoreboard } from "@/components/product/replay-scoreboard";
import { weekRange } from "@/lib/format";

export function Game({ showcase }: { showcase: Showcase }) {
  return (
    <section id="game" className="scroll-mt-20 py-[var(--section-y)]">
      <Container>
        <div className="mb-[var(--stack)] flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-text">
            <p className="t-label inline-flex items-center gap-2 text-accent">
              <Trophy size={16} weight="fill" aria-hidden /> Game of the week · {weekRange(showcase.league.weekId)}
            </p>
            <h2 className="t-display-l mt-4">A real week, replayed.</h2>
          </div>
          <p className="t-lead max-w-[440px]">
            Two hands of real Strike traders, drafted by our bots. Every point below is a trade that happened.
          </p>
        </div>
        <ReplayScoreboard league={showcase.league} matchupId={showcase.featuredMatchupId} />
      </Container>
    </section>
  );
}
