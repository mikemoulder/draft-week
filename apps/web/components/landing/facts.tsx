import { Cards, Lightning, Skull, UsersThree } from "@phosphor-icons/react/dist/ssr";
import type { ShowcaseStats } from "@draftweek/shared";
import { Container } from "@/components/primitives";

const n = (v: number) => v.toLocaleString("en-US");

export function Facts({ stats, live }: { stats: ShowcaseStats; live: boolean }) {
  const tiles = [
    { icon: UsersThree, value: n(stats.tradersFollowed), label: "traders followed", tone: "text-[var(--style-steady)]" },
    { icon: Lightning, value: n(stats.tradesLastWeek), label: "trades last week", tone: "text-[var(--style-scalper)]" },
    { icon: Skull, value: n(stats.liquidationsLastWeek), label: "liquidations last week", tone: "text-danger" },
    { icon: Cards, value: n(stats.draftableThisWeek), label: "cards in this week's draft", tone: "text-accent" },
  ];
  return (
    <section aria-label={live ? "Live numbers" : "Numbers from a saved snapshot"} className="pb-6">
      <Container>
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {tiles.map(({ icon: Icon, value, label, tone }) => (
            <li key={label} className="flex items-center gap-4 rounded-tile border border-line bg-tile/60 p-4 md:p-5">
              <span className={`grid size-11 shrink-0 place-items-center rounded-[14px] bg-fill ${tone}`}>
                <Icon size={24} weight="duotone" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="t-num block text-[26px] leading-none">{value}</span>
                <span className="t-small block text-fg-mute">{label}</span>
              </span>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
