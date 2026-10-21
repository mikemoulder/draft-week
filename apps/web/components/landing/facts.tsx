import type { ShowcaseStats } from "@draftweek/shared";
import { Marquee } from "@/components/motion";

const n = (v: number) => v.toLocaleString("en-US");

export function Facts({ stats, live }: { stats: ShowcaseStats; live: boolean }) {
  const items = [
    `${n(stats.tradersFollowed)} traders followed`,
    `${n(stats.tradesLastWeek)} trades last week`,
    `${n(stats.liquidationsLastWeek)} liquidations last week`,
    `${n(stats.draftableThisWeek)} draftable this week`,
    live ? "Scored from Strike mainnet" : "Snapshot of Strike mainnet data",
    "Free to play",
  ];
  return (
    <div className="border-y border-line py-4">
      <Marquee items={items} seconds={40} label="Live facts" itemClassName="t-label flex items-center gap-8 whitespace-nowrap pr-8 text-fg-soft before:block before:size-1.5 before:bg-fg-faint before:content-['']" />
    </div>
  );
}
