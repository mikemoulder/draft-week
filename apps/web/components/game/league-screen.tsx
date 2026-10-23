"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { PoolTrader } from "@draftweek/shared";
import { LeagueHeader } from "@/components/game/league-header";
import { MatchupsPreview } from "@/components/game/matchups-panel";
import { ResultsView } from "@/components/game/results-view";
import { SquadBuilder } from "@/components/game/squad-builder";
import { useLeague } from "@/components/game/use-league";
import { Container } from "@/components/primitives";
import { useSession } from "@/components/session";
import { ErrorState } from "@/components/states";
import { api } from "@/lib/api";

export function LeagueScreen({ id }: { id: string }) {
  const { me, loading } = useSession();
  const router = useRouter();
  const { league, error, refresh, setLeague } = useLeague(id);
  const [pool, setPool] = useState<PoolTrader[] | null>(null);

  useEffect(() => {
    if (!loading && !me) router.replace(`/signin?next=/leagues/${id}`);
  }, [loading, me, router, id]);

  const weekId = league?.weekId;
  useEffect(() => {
    if (!weekId) return;
    let cancelled = false;
    api
      .get<PoolTrader[]>(`/weeks/${weekId}/pool`)
      .then((p) => !cancelled && setPool(p))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [weekId]);

  if (error && !league) {
    return (
      <Container className="py-16">
        <ErrorState
          title={error.status === 403 ? "This league is private" : error.status === 404 ? "No league here" : "The league did not load"}
          body={error.status === 403 ? "Ask the owner for the invite code and join from your leagues page." : error.message}
          onRetry={error.status >= 500 || error.status === 0 ? () => void refresh() : undefined}
        />
      </Container>
    );
  }

  if (!league || (league.status === "picking" && !pool)) {
    return (
      <Container className="flex flex-col gap-4 py-12">
        <div className="skeleton h-24" />
        <div className="skeleton h-72" />
      </Container>
    );
  }

  return (
    <Container className="py-10 md:py-14">
      <LeagueHeader league={league} />
      {league.status === "picking" && pool ? <SquadBuilder league={league} pool={pool} onChange={setLeague} /> : null}
      {league.status === "picking" ? <MatchupsPreview league={league} /> : null}
      {league.status === "live" || league.status === "final" ? <ResultsView league={league} /> : null}
    </Container>
  );
}
