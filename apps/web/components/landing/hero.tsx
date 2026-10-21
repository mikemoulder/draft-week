import { ArrowLink, Button, Container } from "@/components/primitives";

export function Hero() {
  return (
    <section className="pb-12 pt-16 md:pb-16 md:pt-24">
      <Container>
        <p className="t-label">Fantasy football for Strike Finance</p>
        <h1 className="t-display-xl mt-6 max-w-[11ch] md:mt-8">Five traders. Seven days.</h1>
        <div className="mt-10 flex flex-col gap-8 md:mt-14 md:flex-row md:items-end md:justify-between">
          <p className="t-lead max-w-[560px] text-fg-soft">
            Draft five real traders, and every trade they make on Strike this week scores for you. Free to play.
          </p>
          <div className="flex flex-col gap-4 md:items-end">
            <Button href="/play" size="lg" className="w-full md:w-auto">
              Start a league
            </Button>
            <ArrowLink href="#game">Watch last week&apos;s game</ArrowLink>
          </div>
        </div>
      </Container>
    </section>
  );
}
