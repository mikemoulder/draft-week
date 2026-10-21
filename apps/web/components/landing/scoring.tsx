import { Container } from "@/components/primitives";

const RULES = [
  {
    big: "1 to 10",
    title: "Ranked every day",
    body: "Every trader who traded that day is ranked by return against every other trader who traded. The top tenth scores 10. Returns, not dollars, so a small account can beat a whale.",
  },
  {
    big: "−5",
    title: "Red card",
    body: "A liquidation costs five points on top of the day. Leverage is a strategy, and it has a price.",
    danger: true,
  },
  {
    big: "×1.5",
    title: "Captain and bench",
    body: "Your captain counts one and a half. A starter who sits the day out is replaced by your first bench trader who traded.",
  },
];

export function Scoring() {
  return (
    <section id="scoring" className="scroll-mt-20 border-t border-line py-[var(--section-y)]">
      <Container>
        <h2 className="t-display-l mb-[var(--stack)] max-w-[14ch]">How a trade becomes a point.</h2>
        <div className="grid border-t border-line-strong md:grid-cols-3">
          {RULES.map((r, i) => (
            <div key={r.title} className={`flex flex-col gap-4 border-line py-8 md:py-10 ${i > 0 ? "border-t md:border-l md:border-t-0 md:pl-8" : ""} ${i < 2 ? "md:pr-8" : ""}`}>
              <p className={`t-display-l t-num ${r.danger ? "text-danger" : ""}`}>{r.big}</p>
              <h3 className="t-title">{r.title}</h3>
              <p className="t-body max-w-[42ch] text-fg-mute">{r.body}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
