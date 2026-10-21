"use client";

// The signature (DESIGN.md §2): one matchup replayed day by day. At rest it shows the final state,
// so it is complete without JavaScript and for reduced motion. In view, it plays the week once.
import { useEffect, useRef, useState } from "react";
import { ArrowsDownUp, ArrowsLeftRight, ArrowCounterClockwise, Crown, Robot, Skull, UserCircle } from "@phosphor-icons/react";
import type { LeagueState } from "@draftweek/shared";
import { useReducedMotion } from "@/components/motion";
import { cx } from "@/components/primitives";
import { DAYS, type Chip, leadChangeDays, lineupDays, memberName, totals } from "@/lib/replay";

const DAY_MS = 900;

function weekDates(weekId: string): string[] {
  const start = new Date(`${weekId}T00:00:00Z`);
  return DAYS.map((_, i) => String(new Date(start.getTime() + i * 86_400_000).getUTCDate()));
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

function ChipRow({ chip, animate, delay }: { chip: Chip; animate: boolean; delay: number }) {
  return (
    <li
      className={cx(
        "flex min-w-0 items-center gap-2 rounded-[10px] bg-fill px-2.5 py-1.5 t-small",
        chip.liquidated && "bg-danger-soft text-danger",
        chip.points === null && "text-fg-faint",
        animate && "chip-in",
        animate && chip.liquidated && "red-card-flash",
      )}
      style={animate ? { animationDelay: `${delay}ms` } : undefined}
    >
      {chip.liquidated ? <Skull size={14} weight="fill" aria-label="Liquidated" className="shrink-0" /> : null}
      <span className="min-w-0 flex-1 truncate">{chip.name}</span>
      {chip.captain ? <Crown size={14} weight="fill" className="shrink-0 text-accent" aria-label="Captain" /> : null}
      {chip.sub ? <ArrowsLeftRight size={14} weight="bold" className="shrink-0 text-fg-mute" aria-label="Came off the bench" /> : null}
      <span className="t-num shrink-0">{chip.points === null ? "DNP" : fmt(chip.points)}</span>
    </li>
  );
}

/**
 * The lead line: home's margin over away, day by day, around a zero baseline. Above the line home
 * leads, below it away leads, and every lead change is a visible crossing. (Two cumulative lines
 * overlap when a game is close, which is exactly when it is worth watching.)
 */
function LeadLine({ daily, shown, homeName, awayName }: { daily: [number, number][]; shown: number; homeName: string; awayName: string }) {
  const margins = [0];
  for (const [x, y] of daily) margins.push((margins[margins.length - 1] ?? 0) + x - y);
  const maxAbs = Math.max(4, ...margins.map(Math.abs));
  const pt = (i: number, m: number) => [(i / 7) * 1000, 80 - (m / maxAbs) * 68] as const;
  const visible = margins.slice(0, shown + 1).map((m, i) => pt(i, m));
  const last = visible[visible.length - 1];
  return (
    <div className="relative">
      <p className="t-label absolute left-0 top-0">{homeName} ahead</p>
      <p className="t-label absolute bottom-0 left-0">{awayName} ahead</p>
      <svg viewBox="0 0 1000 160" preserveAspectRatio="none" className="block h-32 w-full md:h-40" aria-hidden>
        {DAYS.map((_, i) => (
          <line key={i} x1={((i + 1) / 7) * 1000} x2={((i + 1) / 7) * 1000} y1="0" y2="160" className="stroke-line" vectorEffect="non-scaling-stroke" />
        ))}
        <line x1="0" x2="1000" y1="80" y2="80" className="stroke-fg-faint" strokeDasharray="4 6" vectorEffect="non-scaling-stroke" />
        <polyline points={visible.map(([x, y]) => `${x},${y}`).join(" ")} fill="none" strokeWidth="3" vectorEffect="non-scaling-stroke" className="stroke-accent" />
      </svg>
      {last && shown > 0 ? (
        <span
          className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 bg-accent"
          style={{ left: `${last[0] / 10}%`, top: `${(last[1] / 160) * 100}%` }}
          aria-hidden
        />
      ) : null}
    </div>
  );
}

function ManagerIcon({ bot }: { bot: boolean }) {
  return bot ? (
    <Robot size={20} weight="duotone" className="shrink-0 text-fg-mute" aria-label="Bot manager" />
  ) : (
    <UserCircle size={20} weight="duotone" className="shrink-0 text-fg-mute" aria-label="Manager" />
  );
}

export function ReplayScoreboard({
  league,
  matchupId,
  autoplay = true,
  caption,
}: {
  league: LeagueState;
  matchupId: string;
  autoplay?: boolean;
  caption?: string;
}) {
  const matchup = league.matchups.find((m) => m.id === matchupId);
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(7);
  const [playing, setPlaying] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const autoplayed = useRef(false);

  // Play once when the board is properly in view.
  useEffect(() => {
    const el = rootRef.current;
    if (!autoplay || reduced || !el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !autoplayed.current) {
          autoplayed.current = true;
          setShown(0);
          setPlaying(true);
        }
      },
      { threshold: 0.45 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [autoplay, reduced]);

  const active = playing && shown < 7;
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => setShown((s) => s + 1), shown === 0 ? 400 : DAY_MS);
    return () => clearTimeout(t);
  }, [active, shown]);

  if (!matchup) return null;

  const replay = () => {
    if (reduced) return setShown(7);
    setShown(0);
    setPlaying(true);
  };

  const [ta, tb] = totals(matchup, shown);
  const leader: "a" | "b" | null = ta > tb ? "a" : tb > ta ? "b" : null;
  const daysA = lineupDays(league, matchup.a);
  const daysB = lineupDays(league, matchup.b);
  const dates = weekDates(league.weekId);
  const leadDays = new Set(leadChangeDays(matchup));
  const state = shown >= 7 ? "Final" : shown === 0 ? "Kickoff" : `After ${DAYS[shown - 1]?.toLowerCase()}`;
  const aName = memberName(league, matchup.a);
  const bName = memberName(league, matchup.b);
  const aBot = league.members.find((m) => m.id === matchup.a)?.isBot ?? false;
  const bBot = league.members.find((m) => m.id === matchup.b)?.isBot ?? false;

  return (
    <div ref={rootRef} className="overflow-hidden rounded-panel border border-line bg-panel shadow-[var(--elev-pop)]">
      {/* Scoreline */}
      <div className="grid grid-cols-2 items-end gap-x-4 gap-y-3 border-b border-line px-4 py-5 md:grid-cols-[1fr_auto_auto_auto_1fr] md:px-8 md:py-7">
        <div className="min-w-0 md:order-1">
          <p className="t-label">Home</p>
          <p className="t-title mt-1 flex items-center gap-2 truncate">
            <ManagerIcon bot={aBot} />
            {aName}
          </p>
        </div>
        <div className="min-w-0 text-right md:order-5">
          <p className="t-label">Away</p>
          <p className="t-title mt-1 flex items-center justify-end gap-2 truncate">
            {bName}
            <ManagerIcon bot={bBot} />
          </p>
        </div>
        <p className={cx("t-display-l t-num md:order-2", leader === "a" ? "text-accent" : "text-fg")} aria-label={`${aName} ${fmt(ta)}`}>
          {fmt(ta)}
        </p>
        <p className="t-label order-last col-span-2 text-center md:order-3 md:col-span-1 md:px-4" aria-live="polite">
          {state}
        </p>
        <p
          className={cx("t-display-l t-num text-right md:order-4", leader === "b" ? "text-accent" : "text-fg")}
          aria-label={`${bName} ${fmt(tb)}`}
        >
          {fmt(tb)}
        </p>
      </div>

      {/* Day strip */}
      <ol className="flex snap-x snap-mandatory overflow-x-auto md:grid md:grid-cols-7 md:overflow-visible">
        {DAYS.map((d, day) => {
          const revealed = day < shown;
          const justNow = playing && day === shown - 1;
          const [dayA, dayB] = matchup.daily[day] ?? [0, 0];
          return (
            <li
              key={d}
              className={cx(
                "flex min-w-[78%] snap-start flex-col gap-3 border-line p-3 transition-opacity duration-300 sm:min-w-[44%] md:min-w-0 md:p-4",
                day > 0 && "border-l",
                !revealed && "opacity-30",
              )}
            >
              <p className="t-label flex items-center justify-between">
                <span>
                  {d} {dates[day]}
                </span>
                {revealed && leadDays.has(day) ? (
                  <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-chip bg-accent-soft px-2 py-0.5 text-accent" title="Lead change">
                    <ArrowsDownUp size={12} weight="bold" aria-hidden />
                    Lead
                  </span>
                ) : null}
              </p>
              {[
                { pts: dayA, chips: daysA[day] ?? [] },
                { pts: dayB, chips: daysB[day] ?? [] },
              ].map((side, i) => (
                <div key={i} className={cx("flex flex-col gap-1.5", i === 1 && "border-t border-line pt-3")}>
                  <p className="t-num text-[22px] leading-none">{revealed ? fmt(side.pts) : "–"}</p>
                  {revealed ? (
                    <ul className="flex flex-col gap-1">
                      {side.chips.map((c, k) => (
                        <ChipRow key={`${c.accountId}-${k}`} chip={c} animate={justNow} delay={k * 60 + i * 180} />
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </li>
          );
        })}
      </ol>

      {/* Lead line */}
      <div className="border-t border-line px-4 py-4 md:px-8">
        <LeadLine daily={matchup.daily} shown={shown} homeName={aName} awayName={bName} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-4 md:px-8">
        <p className="t-small text-fg-mute">{caption ?? "Every point is a real trade on Strike."}</p>
        <button type="button" className="btn btn-ghost btn-sm" onClick={replay} disabled={active}>
          <ArrowCounterClockwise size={15} weight="bold" aria-hidden />
          {active ? "Playing…" : "Replay the week"}
        </button>
      </div>
    </div>
  );
}
