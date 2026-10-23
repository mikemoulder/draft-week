import { Reveal } from "@/components/motion";
import { LogoMark } from "@/components/logo";
import { Container } from "@/components/primitives";

/** Why FTL exists, in the team's words. */
export function Why() {
  return (
    <section aria-labelledby="why" className="pb-[var(--section-y)]">
      <Container>
        <Reveal className="grid gap-8 rounded-panel border border-line p-8 md:grid-cols-[auto_1fr] md:gap-12 md:p-14">
          <LogoMark size={72} className="hidden md:block" />
          <div>
            <h2 id="why" className="t-label">
              Why we built FTL
            </h2>
            <p className="t-display-m mt-5 max-w-[30ch] text-balance">
              We didn&apos;t want to build another generic app. We wanted something innovative, something different: a new way to enjoy
              trading.
            </p>
            <p className="t-lead mt-6 max-w-[62ch] text-fg-soft">
              So we turned the people trading on Strike into cards you pick, back and cheer on, against your friends, every week. You don&apos;t
              have to trade to play, and if you do, your trading makes your squad stronger. That is why we built FTL.
            </p>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
