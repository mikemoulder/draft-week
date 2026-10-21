"use client";

import { useState } from "react";
import { Crown, Robot, UserCircle } from "@phosphor-icons/react";
import type { LeagueState } from "@draftweek/shared";
import { ReplayScoreboard } from "@/components/product/replay-scoreboard";
import { cx } from "@/components/primitives";
import { pts } from "@/lib/format";
import { totals } from "@/lib/replay";

export function ResultsView({ league }: { league: LeagueState }) {
  const mine = league.matchups.find((m) => m.a === league.myMemberId || m.b === league.myMemberId) ?? league.matchups[0];
  const [viewing, setViewing] = useState(mine?.id ?? "");
  const name = (id: string) => league.members.find((m) => m.id === id)?.name ?? "";
  const bot = (id: string) => league.members.find((m) => m.id === id)?.isBot ?? false;
  const days = league.daysRevealed;

  if (!mine) return null;
  return (
    <div className="flex flex-col gap-10 py-8">
      <section aria-label="Matchup">
        <ReplayScoreboard
          key={viewing}
          league={league}
          matchupId={viewing}
          caption={league.status === "live" ? `Live: ${days} of 7 days in. Points update every five minutes.` : undefined}
        />
      </section>
      <aside className="grid gap-8 lg:grid-cols-[5fr_7fr]">
        <section aria-label="Standings" className="rounded-panel bg-tile p-6">
          <h2 className="t-display-m mb-4">Standings</h2>
          <ol className="flex flex-col">
            {league.standings.map((s, i) => (
              <li key={s.memberId} className={cx("flex items-center gap-3 border-b border-line py-3 last:border-0", s.memberId === league.myMemberId && "text-accent")}>
                <span className="t-num w-6 text-[18px] text-fg-mute">{i + 1}</span>
                {bot(s.memberId) ? <Robot size={20} weight="duotone" className="text-fg-mute" aria-hidden /> : <UserCircle size={20} weight="duotone" className="text-fg-mute" aria-hidden />}
                <span className="t-body min-w-0 flex-1 truncate font-semibold">{s.memberId === league.myMemberId ? "You" : name(s.memberId)}</span>
                {i === 0 ? <Crown size={18} weight="fill" className="text-accent" aria-label="Leader" /> : null}
                <span className="t-num text-[20px]">{pts(s.points)}</span>
              </li>
            ))}
          </ol>
        </section>
        <section aria-label="Matchups">
          <h2 className="t-label mb-3">All matchups</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {league.matchups.map((m) => {
              const [a, b] = totals(m, days);
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => setViewing(m.id)}
                    aria-pressed={viewing === m.id}
                    className={cx("grid w-full grid-cols-[1fr_auto] gap-x-3 gap-y-1 rounded-tile px-4 py-3 text-left", viewing === m.id ? "bg-fill-strong" : "bg-fill hover:bg-fill-strong")}
                  >
                    <span className={cx("t-small truncate font-semibold", a > b && "text-accent")}>{name(m.a)}</span>
                    <span className={cx("t-num text-right", a > b && "text-accent")}>{pts(a)}</span>
                    <span className={cx("t-small truncate font-semibold", b > a && "text-accent")}>{name(m.b)}</span>
                    <span className={cx("t-num text-right", b > a && "text-accent")}>{pts(b)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </aside>
    </div>
  );
}
