"use client";

import { useCallback, useEffect, useState } from "react";
import type { LeagueState } from "@draftweek/shared";
import { api, ApiError } from "@/lib/api";

// Poll less often as leagues grow: an event league with hundreds of tabs open must not flood the API.
const pollMs = (members: number) => (members <= 20 ? 5_000 : members <= 100 ? 15_000 : 30_000);

/** The league, kept fresh: polls every 5 s while managers can still join and pick. */
export function useLeague(id: string) {
  const [league, setLeague] = useState<LeagueState | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLeague(await api.get<LeagueState>(`/leagues/${id}`));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError("Could not load the league", 0));
    }
  }, [id]);

  useEffect(() => {
    const first = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(first);
  }, [refresh]);

  const live = league?.status === "picking";
  const every = pollMs(league?.members.length ?? 0);
  useEffect(() => {
    if (!live) return;
    // Skip polls while the tab is hidden; the next visible poll catches up.
    const t = setInterval(() => !document.hidden && void refresh(), every);
    return () => clearInterval(t);
  }, [live, refresh, every]);

  return { league, error, refresh, setLeague };
}
