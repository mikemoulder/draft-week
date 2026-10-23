import { Cards, Lightning, Skull, UsersThree } from "@phosphor-icons/react/dist/ssr";
import type { ShowcaseStats } from "@draftweek/shared";
import { CountUp, Reveal } from "@/components/motion";
import { Container } from "@/components/primitives";


export function Facts({ stats, live }: { stats: ShowcaseStats; live: boolean }) {
  const tiles = [
    { icon: UsersThree, value: stats.tradersFollowed, label: "traders followed", tone: "text-[var(--style-steady)]" },
    { icon: Lightning, value: stats.tradesLastWeek, label: "trades last week", tone: "text-[var(--style-scalper)]" },
    { icon: Skull, value: stats.liquidationsLastWeek, label: "liquidations last week", tone: "text-danger" },
    { icon: Cards, value: stats.draftableThisWeek, label: "traders you can pick this week", tone: "text-accent" },
  ];
  return (
    <section aria-label={live ? "Live numbers" : "Numbers from a saved snapshot"} className="pb-6">
      <Container>
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {tiles.map(({ icon: Icon, value, label, tone }, i) => (
            <Reveal as="li" key={label} delay={i * 60} className="flex items-center gap-4 rounded-tile border border-line bg-tile/60 p-4 md:p-5">
              <span className={`grid size-11 shrink-0 place-items-center rounded-[14px] bg-fill ${tone}`}>
                <Icon size={24} weight="duotone" aria-hidden />
              </span>
              <span className="min-w-0">
                <CountUp value={value} className="block text-[26px] leading-none" />
                <span className="t-small block text-fg-mute">{label}</span>
              </span>
            </Reveal>
          ))}
        </ul>
      </Container>
    </section>
  );
}
