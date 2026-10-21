"use client";

import { useEffect, useState } from "react";
import type { Health } from "@draftweek/shared";

type State = { kind: "loading" } | { kind: "ok"; health: Health } | { kind: "down"; reason: string };

export function ApiStatus() {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    fetch("/api/health", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setState({ kind: "ok", health: (await res.json()) as Health });
      })
      .catch((err: unknown) => setState({ kind: "down", reason: err instanceof Error ? err.message : "unreachable" }));
  }, []);

  if (state.kind === "loading") return <p className="text-sm text-zinc-500">Checking backend…</p>;
  if (state.kind === "down") return <p className="text-sm text-red-600">Backend unreachable ({state.reason})</p>;
  return (
    <p className="text-sm text-emerald-700 dark:text-emerald-400">
      Backend online · database {state.health.db ? "connected" : "down"} · build {state.health.version}
    </p>
  );
}
