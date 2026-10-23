import Link from "next/link";
import { ArrowRight, Crown, Ranking, Skull } from "@phosphor-icons/react/dist/ssr";
import { Container } from "@/components/primitives";

const RULES = [
  {
    icon: Ranking,
    color: "var(--style-scalper)",
    big: "1 to 10",
    title: "Ranked every day",
    body: "Every trader who traded that day is ranked by return against everyone else who traded. The top tenth scores 10. Returns, not dollars, so a small account can beat a whale.",
  },
  {
    icon: Skull,
    color: "var(--danger)",
    big: "−5",
    title: "Red card",
    body: "Get liquidated and it costs five points on top of the day. Leverage is a strategy, and it has a price.",
  },
  {
    icon: Crown,
    color: "var(--accent)",
    big: "×1.5",
    title: "Captain and bench",
    body: "Your captain counts one and a half. A starter who sits the day out is swapped for your first bench trader who traded.",
  },
];

export function Scoring() {
  return (
    <section id="scoring" className="scroll-mt-20 pb-[var(--section-y)]">
      <Container>
        <h2 className="t-display-l mb-[var(--stack)] max-w-[15ch]">How a trade becomes a point.</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {RULES.map(({ icon: Icon, color, big, title, body }) => (
            <article key={title} className="relative overflow-hidden rounded-panel border border-line bg-tile p-7 md:p-8">
              <span className="absolute -right-6 -top-6 opacity-[0.12]" style={{ color }} aria-hidden>
                <Icon size={150} weight="fill" />
              </span>
              <span className="grid size-12 place-items-center rounded-[16px]" style={{ background: `color-mix(in oklab, ${color} 18%, transparent)`, color }}>
                <Icon size={26} weight="duotone" aria-hidden />
              </span>
              <p className="t-display-l t-num mt-6" style={{ color }}>
                {big}
              </p>
              <h3 className="t-title mt-3">{title}</h3>
              <p className="t-body mt-2 text-fg-mute">{body}</p>
            </article>
          ))}
        </div>
        <Link href="/how-it-works" className="t-body mt-6 inline-flex items-center gap-2 font-semibold text-action hover:underline">
          The full rules, and how FTL stays fair <ArrowRight size={16} weight="bold" aria-hidden />
        </Link>
      </Container>
    </section>
  );
}
