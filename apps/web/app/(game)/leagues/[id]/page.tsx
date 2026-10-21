import { Suspense } from "react";
import { LeagueScreen } from "@/components/game/league-screen";
import { Container } from "@/components/primitives";

// The id comes from the URL at request time, so it is resolved inside a Suspense boundary.
export default function LeaguePage({ params }: PageProps<"/leagues/[id]">) {
  return (
    <Suspense
      fallback={
        <Container className="flex flex-col gap-4 py-12">
          <div className="skeleton h-24" />
          <div className="skeleton h-72" />
        </Container>
      }
    >
      <Resolved params={params} />
    </Suspense>
  );
}

async function Resolved({ params }: { params: PageProps<"/leagues/[id]">["params"] }) {
  const { id } = await params;
  return <LeagueScreen id={id} />;
}
