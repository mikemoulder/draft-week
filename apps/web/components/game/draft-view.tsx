"use client";

import { useMemo, useState } from "react";
import { Hourglass, MagnifyingGlass, Robot, Sparkle } from "@phosphor-icons/react";
import type { LeagueState, PoolTrader, TraderStyle } from "@draftweek/shared";
import { MiniCard } from "@/components/cards/mini-card";
import { StyleIcon } from "@/components/cards/style-icon";
import { TraderCard } from "@/components/cards/trader-card";
import { cx } from "@/components/primitives";
import { toast } from "@/components/states";
import { api } from "@/lib/api";
import { STYLE_META } from "@/lib/styles";

const STYLES: (TraderStyle | "all")[] = ["all", "degen", "scalper", "swing", "steady"];

export function DraftView({ league, pool, onChange }: { league: LeagueState; pool: PoolTrader[]; onChange: (l: LeagueState) => void }) {
  const [style, setStyle] = useState<TraderStyle | "all">("all");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const myTurn = league.onTheClock === league.myMemberId;
  const onClock = league.members.find((m) => m.id === league.onTheClock);
  const takenBy = useMemo(() => new Map(league.picks.map((p) => [p.accountId, p.memberId])), [league.picks]);
  const memberName = (id: string) => league.members.find((m) => m.id === id)?.name ?? "";
  const byId = useMemo(() => new Map(pool.map((t) => [t.accountId, t])), [pool]);
  const myHand = league.picks.filter((p) => p.memberId === league.myMemberId).map((p) => byId.get(p.accountId)).filter(Boolean) as PoolTrader[];
  const round = Math.floor(league.picks.length / league.size) + 1;

  const shown = pool.filter(
    (t) => (style === "all" || t.style === style) && (!query || t.name.toLowerCase().includes(query.trim().toLowerCase())),
  );

  async function draft(t: PoolTrader) {
    setBusy(t.accountId);
    try {
      onChange(await api.post<LeagueState>(`/leagues/${league.id}/picks`, { accountId: t.accountId }));
      toast.success(`${t.name} joins your hand`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "That pick did not go through");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-8 py-8">
      {/* On the clock */}
      <div className={cx("flex flex-wrap items-center justify-between gap-4 rounded-panel p-5 md:p-6", myTurn ? "bg-action text-on-action" : "bg-tile")}>
        <p className="t-display-m flex items-center gap-3">
          {myTurn ? <Sparkle size={28} weight="fill" aria-hidden /> : onClock?.isBot ? <Robot size={28} weight="duotone" aria-hidden /> : <Hourglass size={28} weight="duotone" aria-hidden />}
          {myTurn ? "You're on the clock" : `${onClock?.name ?? "Someone"} is picking`}
        </p>
        <p className={cx("t-label", myTurn ? "text-on-action" : "")}>
          Round {Math.min(round, 5)} of 5 · pick {league.picks.length + 1} of {league.size * 5}
        </p>
      </div>

      {/* My hand */}
      <section aria-label="Your hand">
        <p className="t-label mb-3">Your hand</p>
        <ol className="grid grid-cols-1 gap-2 sm:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => myHand[i] ?? null).map((t, i) => (
            <li key={i}>{t ? <MiniCard trader={t} /> : <div className="grid h-[54px] place-items-center rounded-[16px] border border-dashed border-line-strong t-label text-fg-faint">Card {i + 1}</div>}</li>
          ))}
        </ol>
      </section>

      {/* Pool */}
      <section aria-label="Draft pool">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by style">
            {STYLES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStyle(s)}
                aria-pressed={style === s}
                className={cx("t-label inline-flex items-center gap-1.5 rounded-chip px-3.5 py-2", style === s ? "bg-fg text-ground" : "bg-fill text-fg-soft hover:bg-fill-strong")}
              >
                {s === "all" ? null : <StyleIcon style={s} size={13} />}
                {s === "all" ? "All styles" : STYLE_META[s].label}
              </button>
            ))}
          </div>
          <label className="relative md:w-72">
            <span className="sr-only">Search traders</span>
            <MagnifyingGlass size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-mute" aria-hidden />
            <input id="pool-search" className="field-input w-full !pl-10" placeholder="Search by name or handle" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
        </div>

        <ul className="grid grid-cols-[repeat(auto-fill,minmax(208px,1fr))] justify-items-center gap-5">
          {shown.map((t) => {
            const owner = takenBy.get(t.accountId);
            return (
              <li key={t.accountId} className={cx(owner && "opacity-45")}>
                <TraderCard
                  trader={t}
                  footer={
                    owner ? (
                      <p className="t-small text-center text-fg-mute">Taken by {owner === league.myMemberId ? "you" : memberName(owner)}</p>
                    ) : (
                      <button type="button" className="btn btn-action btn-sm w-full" disabled={!myTurn || busy !== null} onClick={() => draft(t)}>
                        {busy === t.accountId ? "Drafting…" : "Draft"}
                      </button>
                    )
                  }
                />
              </li>
            );
          })}
        </ul>
        {shown.length === 0 ? <p className="t-body py-10 text-center text-fg-mute">No traders match that filter.</p> : null}
      </section>
    </div>
  );
}
