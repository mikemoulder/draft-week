import { ArrowRight, PlayCircle } from "@phosphor-icons/react/dist/ssr";
import type { PoolTrader } from "@draftweek/shared";
import { TraderCard } from "@/components/cards/trader-card";
import { Container } from "@/components/primitives";
import Image from "next/image";
import Link from "next/link";

// A fanned hand: five real cards, rotated around a point below the hand like cards held in a fist.
const FAN = [
  { r: -14, x: -212, y: 40 },
  { r: -7, x: -106, y: 10 },
  { r: 0, x: 0, y: 0 },
  { r: 7, x: 106, y: 10 },
  { r: 14, x: 212, y: 40 },
];

export function Hero({ stars }: { stars: PoolTrader[] }) {
  const hand = stars.slice(0, 5);
  return (
    <section className="floodlight overflow-hidden pb-16 pt-14 md:pb-24 md:pt-20">
      <Container className="grid items-center gap-14 lg:grid-cols-[1fr_1.05fr]">
        <div>
          <a
            href="https://strikefinance.org"
            target="_blank"
            rel="noreferrer"
            className="t-label inline-flex items-center gap-2 rounded-chip border border-line-strong py-1.5 pl-1.5 pr-3 text-fg-soft transition-colors hover:border-fg-mute hover:text-fg"
          >
            <Image src="/strike-logo.png" alt="" width={22} height={22} className="rounded-full" priority /> Powered by Strike
          </a>
          <h1 className="t-display-xl mt-7 max-w-[10ch]">
            Five traders. <span className="text-action">Seven days.</span>
          </h1>
          <p className="t-lead mt-7 max-w-[500px] text-fg-soft">
            Draft five real Strike traders into your hand. Every trade they make this week scores for you, and your friends
            are trying to beat you. Free to play.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
            <Link href="/play" className="btn btn-action btn-lg">
              Start a league <ArrowRight size={17} weight="bold" aria-hidden />
            </Link>
            <a href="#game" className="flex items-center gap-2 t-body font-semibold text-fg-soft hover:text-fg">
              <PlayCircle size={22} weight="duotone" aria-hidden /> Watch last week&apos;s game
            </a>
          </div>
        </div>

        {/* Desktop: a fanned hand. Phone: an overlapping row you can swipe. */}
        <div className="relative hidden h-[440px] lg:block lg:translate-x-10" aria-label="This week's top rated traders">
          {hand.map((t, i) => {
            const f = FAN[i] as (typeof FAN)[number];
            return (
              <div
                key={t.accountId}
                className="absolute left-1/2 top-4 -ml-[104px]"
                style={{ transform: `translate(${f.x}px, ${f.y}px) rotate(${f.r}deg)`, zIndex: 5 - Math.abs(i - 2) }}
              >
                <TraderCard trader={t} />
              </div>
            );
          })}
        </div>
        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-4 lg:hidden" aria-label="This week's top rated traders">
          {hand.map((t) => (
            <div key={t.accountId} className="snap-start">
              <TraderCard trader={t} />
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
