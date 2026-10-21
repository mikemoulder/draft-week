"use client";

import { useState } from "react";
import { Play, Robot, UserCircle } from "@phosphor-icons/react";
import type { LeagueState } from "@draftweek/shared";
import { cx } from "@/components/primitives";
import { toast } from "@/components/states";
import { api } from "@/lib/api";

export function SetupView({ league, onChange }: { league: LeagueState; onChange: (l: LeagueState) => void }) {
  const [busy, setBusy] = useState(false);
  const isOwner = league.ownerMemberId === league.myMemberId;
  const owner = league.members.find((m) => m.id === league.ownerMemberId);
  const seats = Array.from({ length: league.size }, (_, seat) => league.members.find((m) => m.seat === seat) ?? null);

  async function start() {
    setBusy(true);
    try {
      onChange(await api.post<LeagueState>(`/leagues/${league.id}/start`));
      toast.success("The draft is on");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start the draft");
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-10 py-10 lg:grid-cols-[7fr_5fr]">
      <section aria-label="Seats">
        <p className="t-label mb-4">Seats, in draft order</p>
        <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {seats.map((m, seat) => (
            <li
              key={seat}
              className={cx(
                "flex flex-col items-center gap-2 rounded-tile p-5 text-center",
                m ? "bg-tile" : "border border-dashed border-line-strong text-fg-faint",
              )}
            >
              {m ? <UserCircle size={36} weight="duotone" className="text-[var(--style-steady)]" aria-hidden /> : <Robot size={36} weight="duotone" aria-hidden />}
              <span className="t-small w-full truncate font-semibold">{m ? m.name : "Bot"}</span>
              <span className="t-label text-[10px]">Pick {seat + 1}</span>
            </li>
          ))}
        </ol>
      </section>
      <aside className="flex flex-col gap-5 rounded-panel bg-tile p-7">
        <h2 className="t-display-m">Waiting for the draft</h2>
        <p className="t-body text-fg-mute">
          Share the invite code with your group. Empty seats are filled by bots when the draft starts, so you can also play
          alone right now.
        </p>
        {isOwner ? (
          <button type="button" className="btn btn-action btn-lg self-start" onClick={start} disabled={busy}>
            <Play size={18} weight="fill" aria-hidden /> {busy ? "Starting…" : "Start the draft"}
          </button>
        ) : (
          <p className="t-body font-semibold">{owner?.name ?? "The owner"} starts the draft.</p>
        )}
      </aside>
    </div>
  );
}
