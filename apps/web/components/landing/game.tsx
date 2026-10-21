import type { Showcase } from "@draftweek/shared";
import { Container } from "@/components/primitives";
import { ReplayScoreboard } from "@/components/product/replay-scoreboard";

function range(weekId: string): string {
  const start = new Date(`${weekId}T00:00:00Z`);
  const end = new Date(start.getTime() + 6 * 86_400_000);
  const f = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return `${f(start)} to ${f(end)}`;
}

export function Game({ showcase }: { showcase: Showcase }) {
  return (
    <section id="game" className="scroll-mt-20 py-[var(--section-y)]">
      <Container>
        <div className="mb-[var(--stack)] flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-text">
            <p className="t-label">Last week · {range(showcase.league.weekId)} · Game of the week</p>
            <h2 className="t-display-l mt-4">A real week, replayed.</h2>
          </div>
          <p className="t-lead max-w-[440px]">
            Two lineups of real Strike traders, drafted by our bots. Every point below is a trade that happened.
          </p>
        </div>
        <ReplayScoreboard league={showcase.league} matchupId={showcase.featuredMatchupId} />
      </Container>
    </section>
  );
}
