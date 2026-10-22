"use client";

import { useCallback, useEffect, useState } from "react";
import type { LeagueState } from "@draftweek/shared";
import { api, ApiError } from "@/lib/api";

const POLL_MS = 5000;

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
  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(t);
  }, [live, refresh]);

  return { league, error, refresh, setLeague };
}
