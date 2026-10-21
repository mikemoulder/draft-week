"use client";

import { useState } from "react";
import { ArrowsDownUp, Crown, Lock, Play, FloppyDisk } from "@phosphor-icons/react";
import type { LeagueState, PoolTrader } from "@draftweek/shared";
import { TraderCard } from "@/components/cards/trader-card";
import { cx } from "@/components/primitives";
import { toast } from "@/components/states";
import { api } from "@/lib/api";

export function LineupView({ league, pool, onChange }: { league: LeagueState; pool: PoolTrader[]; onChange: (l: LeagueState) => void }) {
  const saved = league.lineups.find((l) => l.memberId === league.myMemberId);
  const [starters, setStarters] = useState<string[]>(saved?.starters ?? []);
  const [bench, setBench] = useState<string[]>(saved?.bench ?? []);
  const [captain, setCaptain] = useState(saved?.captainId ?? "");
  const [picked, setPicked] = useState<string | null>(null);
  const [busy, setBusy] = useState<"save" | "play" | null>(null);

  const byId = new Map(pool.map((t) => [t.accountId, t]));
  const isOwner = league.ownerMemberId === league.myMemberId;
  // A finished week (replay) is played on demand; captured once so render stays pure.
  const [now] = useState(() => Date.now());
  const replay = new Date(`${league.weekId}T00:00:00Z`).getTime() + 7 * 86_400_000 <= now;
  const dirty = !saved || saved.captainId !== captain || saved.starters.join() !== starters.join() || saved.bench.join() !== bench.join();

  // Tap one card, then another, to swap them between starters and bench.
  function tap(id: string) {
    if (!picked) return setPicked(id);
    if (picked === id) return setPicked(null);
    const swap = (list: string[]) => list.map((x) => (x === picked ? id : x === id ? picked : x));
    const s = swap(starters);
    const b = swap(bench);
    setStarters(s);
    setBench(b);
    if (!s.includes(captain)) setCaptain(s[0] ?? "");
    setPicked(null);
  }

  async function save() {
    setBusy("save");
    try {
      onChange(await api.put<LeagueState>(`/leagues/${league.id}/lineup`, { captainId: captain, starters, bench }));
      toast.success("Lineup saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the lineup");
    } finally {
      setBusy(null);
    }
  }

  async function play() {
    setBusy("play");
    try {
      if (dirty) await api.put<LeagueState>(`/leagues/${league.id}/lineup`, { captainId: captain, starters, bench });
      onChange(await api.post<LeagueState>(`/leagues/${league.id}/play`));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not play the week");
      setBusy(null);
    }
  }

  const card = (id: string, role: "starter" | "bench") => {
    const t = byId.get(id);
    if (!t) return null;
    return (
      <li key={id} className="flex flex-col items-center gap-3">
        <button type="button" onClick={() => tap(id)} className={cx("rounded-[22px] transition-transform", picked === id && "-translate-y-2 ring-4 ring-accent")} aria-pressed={picked === id} aria-label={`${t.name}: tap to swap`}>
          <TraderCard trader={t} className={role === "bench" ? "scale-[0.92]" : ""} />
        </button>
        {role === "starter" ? (
          <button
            type="button"
            onClick={() => setCaptain(id)}
            aria-pressed={captain === id}
            className={cx("t-label inline-flex items-center gap-1.5 rounded-chip px-3 py-1.5", captain === id ? "bg-accent text-ground" : "bg-fill text-fg-mute hover:text-fg")}
          >
            <Crown size={14} weight="fill" aria-hidden /> {captain === id ? "Captain" : "Make captain"}
          </button>
        ) : null}
      </li>
    );
  };

  return (
    <div className="grid gap-10 py-8 xl:grid-cols-[1fr_340px]">
      <div className="flex flex-col gap-10">
        <section aria-label="Starters">
          <h2 className="t-display-m mb-1">Starters</h2>
          <p className="t-body mb-6 text-fg-mute">They score every day they trade. Your captain counts one and a half.</p>
          <ul className="flex flex-wrap justify-center gap-6 sm:justify-start">{starters.map((id) => card(id, "starter"))}</ul>
        </section>
        <section aria-label="Bench">
          <h2 className="t-display-m mb-1 flex items-center gap-2">
            <ArrowsDownUp size={26} weight="duotone" aria-hidden /> Bench
          </h2>
          <p className="t-body mb-6 text-fg-mute">A starter who sits a day out is replaced by your first bench trader who traded. Tap two cards to swap them.</p>
          <ul className="flex flex-wrap justify-center gap-6 sm:justify-start">{bench.map((id) => card(id, "bench"))}</ul>
        </section>
      </div>

      <aside className="flex h-fit flex-col gap-4 rounded-panel bg-tile p-7 xl:sticky xl:top-24">
        {replay ? (
          <>
            <h2 className="t-display-m">Ready when you are</h2>
            <p className="t-body text-fg-mute">This week already happened. Lock your lineup and watch all seven days play out against your opponent.</p>
            {isOwner ? (
              <button type="button" className="btn btn-action btn-lg" onClick={play} disabled={busy !== null}>
                <Play size={18} weight="fill" aria-hidden /> {busy === "play" ? "Kicking off…" : "Play the week"}
              </button>
            ) : (
              <p className="t-body font-semibold">The league owner kicks off the week.</p>
            )}
          </>
        ) : (
          <>
            <h2 className="t-display-m flex items-center gap-2">
              <Lock size={24} weight="duotone" aria-hidden /> Locks Monday
            </h2>
            <p className="t-body text-fg-mute">Lineups lock when the week starts at 00:00 UTC on Monday. Scores arrive every day after that.</p>
          </>
        )}
        <button type="button" className="btn btn-ghost" onClick={save} disabled={!dirty || busy !== null}>
          <FloppyDisk size={17} weight="duotone" aria-hidden /> {busy === "save" ? "Saving…" : dirty ? "Save lineup" : "Lineup saved"}
        </button>
      </aside>
    </div>
  );
}
