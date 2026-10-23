"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CaretRight, CheckCircle, Crown, HourglassMedium, Robot, UserCircle, UsersThree, X } from "@phosphor-icons/react";
import { MIN_LEAGUE_SIZE, type LeagueState } from "@draftweek/shared";
import { cx } from "@/components/primitives";
import { pts } from "@/lib/format";
import { CopyCode } from "./copy-code";

/** "2 managers" in the league header: opens the list of everyone in the league. */
export function MembersButton({ league }: { league: LeagueState }) {
  const [open, setOpen] = useState(false);
  const humans = league.members.filter((m) => !m.isBot).length;
  const bots = league.members.length - humans;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-chip bg-fill px-3 py-1 text-fg-soft transition-colors hover:bg-fill-strong hover:text-fg"
        aria-haspopup="dialog"
      >
        <UsersThree size={18} weight="duotone" aria-hidden />
        {humans} {humans === 1 ? "manager" : "managers"}
        {bots > 0 ? ` and ${bots} bots` : ""}
        <span className="t-label ml-1 text-[10px] text-action">See who&apos;s in</span>
        <CaretRight size={13} weight="bold" className="text-action" aria-hidden />
      </button>
      {open ? <MembersSheet league={league} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function MembersSheet({ league, onClose }: { league: LeagueState; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const picking = league.status === "picking";
  // Join order: managers by seat, then bots, the same order the matchups are drawn in.
  const members = [...league.members].sort((a, b) => Number(a.isBot) - Number(b.isBot) || a.seat - b.seat);
  const standing = new Map(league.standings.map((s, i) => [s.memberId, { ...s, rank: i + 1 }]));
  const humans = members.filter((m) => !m.isBot).length;
  const open = league.size - league.members.length;
  const picked = league.members.filter((m) => !m.isBot && m.hasSquad).length;

  // Portalled to <body> so no transformed or animated ancestor can trap or out-stack the overlay.
  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Who's in this league">
      <button type="button" className="absolute inset-0 bg-[rgb(10_8_20_/_0.6)]" aria-label="Close" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-[440px] flex-col overflow-y-auto bg-panel shadow-[var(--elev-pop)]">
        <div className="flex items-start gap-4 border-b border-line p-6">
          <UsersThree size={34} weight="duotone" className="mt-1 text-action" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="t-display-m">Who&apos;s in</p>
            <p className="t-small mt-1 text-fg-mute">
              {humans} {humans === 1 ? "manager" : "managers"}
              {picking ? ` · up to ${league.size}` : ""}
              {picking ? ` · ${picked} ${picked === 1 ? "squad" : "squads"} picked` : ""}
            </p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} className="grid size-10 shrink-0 place-items-center rounded-full bg-fill hover:bg-fill-strong" aria-label="Close">
            <X size={18} weight="bold" aria-hidden />
          </button>
        </div>

        <ol className="flex flex-col p-4">
          {members.map((m, i) => {
            const me = m.id === league.myMemberId;
            const s = standing.get(m.id);
            return (
              <li key={m.id} className={cx("flex items-center gap-3 rounded-tile px-3 py-3", me && "bg-accent-soft")}>
                <span className="t-num w-6 text-center text-[14px] text-fg-mute">{i + 1}</span>
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-fill text-fg-mute">
                  {m.isBot ? <Robot size={20} weight="duotone" aria-hidden /> : <UserCircle size={22} weight="duotone" aria-hidden />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="t-body flex items-center gap-2 font-semibold">
                    <span className="truncate">{me ? "You" : m.name}</span>
                    {m.id === league.ownerMemberId ? (
                      <span className="t-label inline-flex shrink-0 items-center gap-1 rounded-chip bg-fill-strong px-2 py-0.5 text-[10px] text-accent">
                        <Crown size={10} weight="fill" aria-hidden /> Owner
                      </span>
                    ) : null}
                    {m.isBot ? <span className="t-label shrink-0 text-[10px] text-fg-faint">Bot</span> : null}
                  </span>
                  <span className="t-small block text-fg-mute">
                    {m.budget} credits{m.bonus > 0 ? `, +${m.bonus} for trading on Strike` : ""}
                  </span>
                </span>
                {picking ? (
                  m.hasSquad ? (
                    <span className="t-label inline-flex items-center gap-1 text-[10px] text-success">
                      <CheckCircle size={15} weight="fill" aria-hidden /> Picked
                    </span>
                  ) : (
                    <span className="t-label inline-flex items-center gap-1 text-[10px] text-fg-mute">
                      <HourglassMedium size={15} weight="duotone" aria-hidden /> Picking
                    </span>
                  )
                ) : s ? (
                  <span className="text-right">
                    <span className="t-num block text-[18px] leading-none">{pts(s.points)}</span>
                    <span className="t-label text-[10px]">
                      {ordinal(s.rank)}
                      {s.result ? ` · ${s.result}` : ""}
                    </span>
                  </span>
                ) : null}
              </li>
            );
          })}
          {picking && open > 0 ? (
            <li className="mt-1 flex items-center gap-3 rounded-tile border border-dashed border-line px-3 py-3 text-fg-mute">
              <span className="w-6" />
              <span className="grid size-9 shrink-0 place-items-center rounded-full border border-dashed border-line-strong">
                <Robot size={18} weight="duotone" aria-hidden />
              </span>
              <span className="t-small">
                {open} more {open === 1 ? "manager" : "managers"} can join with the invite code. At kick-off, bots only make up the numbers: at least{" "}
                {MIN_LEAGUE_SIZE} players, and an even count so everyone has an opponent.
              </span>
            </li>
          ) : null}
        </ol>

        {picking ? (
          <div className="mt-auto flex flex-col gap-2 border-t border-line p-6">
            <p className="t-label">Invite code</p>
            <CopyCode code={league.inviteCode} />
          </div>
        ) : null}
      </aside>
    </div>,
    document.body,
  );
}

function ordinal(n: number) {
  const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${s}`;
}
