"use client";

import { useState } from "react";
import { Crown, HandCoins, Robot, UserCircle } from "@phosphor-icons/react";
import type { LeagueState } from "@draftweek/shared";
import { ReplayScoreboard } from "@/components/product/replay-scoreboard";
import { cx } from "@/components/primitives";
import { pts } from "@/lib/format";
import { BUILDER_CODE } from "@/lib/strike-copy";
import { BackSquadButton } from "./back-squad";
import { MATCHUP_RULE } from "./matchups-panel";
import { totals } from "@/lib/replay";

export function ResultsView({ league }: { league: LeagueState }) {
  const mine = league.matchups.find((m) => m.a === league.myMemberId || m.b === league.myMemberId) ?? league.matchups[0];
  const [viewing, setViewing] = useState(mine?.id ?? "");
  const name = (id: string) => league.members.find((m) => m.id === id)?.name ?? "";
  const bot = (id: string) => league.members.find((m) => m.id === id)?.isBot ?? false;
  const days = league.daysRevealed;

  if (!mine) return null;
  const isMine = (m: typeof mine) => m.a === league.myMemberId || m.b === league.myMemberId;
  const opponent = (m: typeof mine) => name(m.a === league.myMemberId ? m.b : m.a);
  const current = league.matchups.find((m) => m.id === viewing) ?? mine;
  const label = (id: string) => (id === league.myMemberId ? "You" : name(id));
  return (
    <div className="flex flex-col gap-10 py-8">
      {league.myMemberId && BUILDER_CODE ? (
        <section
          aria-label="Copytrade your squad"
          className="flex flex-col items-start gap-5 rounded-panel border border-[color-mix(in_oklab,var(--action)_45%,transparent)] bg-[color-mix(in_oklab,var(--action)_9%,var(--tile))] p-5 md:flex-row md:items-center md:justify-between md:px-7"
        >
          <div className="flex items-center gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-[14px] bg-[color-mix(in_oklab,var(--action)_20%,transparent)] text-action">
              <HandCoins size={26} weight="duotone" aria-hidden />
            </span>
            <div>
              <h2 className="t-title">Believe in your five? Copy them on Strike.</h2>
              <p className="t-small mt-1 text-fg-mute">Their next trades open in your Strike account, within limits you set. Stop any time.</p>
            </div>
          </div>
          <BackSquadButton league={league} className="w-full shrink-0 md:w-auto" />
        </section>
      ) : null}
      <section aria-label="Matchup">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="t-label">{viewing === mine.id && isMine(mine) ? `Your matchup: you v ${opponent(mine)}` : `Watching ${name(current.a)} v ${name(current.b)}`}</p>
          {viewing !== mine.id && isMine(mine) ? (
            <button type="button" className="t-small text-accent underline underline-offset-4" onClick={() => setViewing(mine.id)}>
              Back to your matchup
            </button>
          ) : null}
        </div>
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
                {s.result ? (
                  <span
                    className={cx("t-label grid size-6 place-items-center rounded-[6px] text-[10px]", s.result === "W" ? "bg-success-soft text-success" : s.result === "L" ? "bg-danger-soft text-danger" : "bg-fill text-fg-mute")}
                    title={s.result === "W" ? "Won the matchup" : s.result === "L" ? "Lost the matchup" : "Matchup level"}
                  >
                    {s.result}
                  </span>
                ) : null}
                <span className="t-num text-[20px]">{pts(s.points)}</span>
              </li>
            ))}
          </ol>
        </section>
        <section aria-label="Matchups">
          <h2 className="t-label">All matchups</h2>
          <p className="t-small mb-3 mt-1 text-fg-mute">{MATCHUP_RULE}</p>
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
                    <span className={cx("t-small truncate font-semibold", a > b && "text-accent")}>{label(m.a)}</span>
                    <span className={cx("t-num text-right", a > b && "text-accent")}>{pts(a)}</span>
                    <span className={cx("t-small truncate font-semibold", b > a && "text-accent")}>{label(m.b)}</span>
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
