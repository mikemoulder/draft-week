import { Button, Container } from "@/components/primitives";

export function Close() {
  return (
    <section className="py-[calc(var(--section-y)*1.2)] text-center">
      <Container>
        <h2 className="t-display-l mx-auto max-w-[14ch]">Draft night is tonight.</h2>
        <p className="t-lead mx-auto mt-6 max-w-[520px]">Sign in with your Strike wallet, or play as a guest. It takes a minute.</p>
        <div className="mt-10 flex justify-center">
          <Button href="/play" size="lg">
            Start a league
          </Button>
        </div>
      </Container>
    </section>
  );
}
