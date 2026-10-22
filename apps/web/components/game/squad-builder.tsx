"use client";

import { useMemo, useState } from "react";
import { ArrowsDownUp, Check, Crown, FloppyDisk, Lightning, MagnifyingGlass, Play, Plus, X } from "@phosphor-icons/react";
import { VOLUME_BONUS_TIERS, type LeagueState, type PoolTrader, type TraderStyle } from "@draftweek/shared";
import { TraderAvatar } from "@/components/cards/avatar";
import { GradeBadge } from "@/components/cards/grade";
import { StyleIcon } from "@/components/cards/style-icon";
import { cx } from "@/components/primitives";
import { toast } from "@/components/states";
import { api } from "@/lib/api";
import { STYLE_META } from "@/lib/styles";
import { BackSquadButton } from "./back-squad";
import { TraderSheet } from "./trader-sheet";

type Slot = string | null;
type SortKey = "points" | "priceHigh" | "priceLow" | "return" | "grade";
const SORTS: { key: SortKey; label: string }[] = [
  { key: "points", label: "Last week's points" },
  { key: "priceHigh", label: "Price, high to low" },
  { key: "priceLow", label: "Price, low to high" },
  { key: "return", label: "Return" },
  { key: "grade", label: "Grade" },
];
const GRADE_ORDER = { "A+": 0, A: 1, B: 2, C: 3, D: 4 } as const;
const STYLES: (TraderStyle | "all")[] = ["all", "degen", "scalper", "swing", "steady"];

function PitchSlot({
  trader,
  role,
  captain,
  swapping,
  onOpen,
  onRemove,
  onCaptain,
  onSwap,
}: {
  trader: PoolTrader | null;
  role: "starter" | "bench";
  captain: boolean;
  swapping: boolean;
  onOpen: () => void;
  onRemove: () => void;
  onCaptain: () => void;
  onSwap: () => void;
}) {
  if (!trader) {
    return (
      <div className="flex w-[104px] flex-col items-center gap-2 text-center sm:w-[124px]">
        <span className="grid size-16 place-items-center rounded-full border-2 border-dashed border-line-strong text-fg-faint">
          <Plus size={22} weight="bold" aria-hidden />
        </span>
        <span className="t-label text-[10px]">{role === "starter" ? "Starter" : "Bench"}</span>
      </div>
    );
  }
  return (
    <div className={cx("relative flex w-[104px] flex-col items-center gap-1.5 text-center sm:w-[124px]", swapping && "-translate-y-1")}>
      <button type="button" onClick={onOpen} className="relative rounded-full" aria-label={`${trader.name}: details`} style={{ "--card-style": `var(--style-${trader.style})` } as React.CSSProperties}>
        <TraderAvatar accountId={trader.accountId} style={trader.style} avatarUrl={trader.avatarUrl} size={64} className={swapping ? "ring-4 ring-accent" : ""} />
        {captain ? (
          <span className="absolute -right-1 -top-1 grid size-6 place-items-center rounded-full bg-accent text-ground" aria-label="Captain">
            <Crown size={13} weight="fill" aria-hidden />
          </span>
        ) : null}
      </button>
      <span className="t-small w-full truncate font-semibold">{trader.name}</span>
      <span className="t-label inline-flex items-center gap-1.5 text-[10px]">
        <GradeBadge grade={trader.grade} className="!h-5 !min-w-7 !text-[11px]" /> {trader.price} cr
      </span>
      <div className="mt-0.5 flex gap-1">
        {role === "starter" ? (
          <button type="button" onClick={onCaptain} aria-pressed={captain} title="Make captain" aria-label="Make captain" className={cx("grid size-7 place-items-center rounded-full", captain ? "bg-accent text-ground" : "bg-fill text-fg-mute hover:text-fg")}>
            <Crown size={14} weight="fill" aria-hidden />
          </button>
        ) : null}
        <button type="button" onClick={onSwap} aria-pressed={swapping} title="Swap with another slot" aria-label="Swap" className={cx("grid size-7 place-items-center rounded-full", swapping ? "bg-accent text-ground" : "bg-fill text-fg-mute hover:text-fg")}>
          <ArrowsDownUp size={14} weight="bold" aria-hidden />
        </button>
        <button type="button" onClick={onRemove} title="Remove" aria-label="Remove from squad" className="grid size-7 place-items-center rounded-full bg-fill text-fg-mute hover:text-danger">
          <X size={14} weight="bold" aria-hidden />
        </button>
      </div>
    </div>
  );
}

export function SquadBuilder({ league, pool, onChange }: { league: LeagueState; pool: PoolTrader[]; onChange: (l: LeagueState) => void }) {
  const me = league.members.find((m) => m.id === league.myMemberId);
  const saved = league.squads.find((s) => s.memberId === league.myMemberId);
  const [starters, setStarters] = useState<Slot[]>(saved ? [...saved.starters] : [null, null, null]);
  const [bench, setBench] = useState<Slot[]>(saved ? [...saved.bench] : [null, null]);
  const [captain, setCaptain] = useState<string | null>(saved?.captainId ?? null);
  const [swapFrom, setSwapFrom] = useState<{ role: "starter" | "bench"; i: number } | null>(null);
  const [open, setOpen] = useState<PoolTrader | null>(null);
  const [style, setStyle] = useState<TraderStyle | "all">("all");
  const [sort, setSort] = useState<SortKey>("points");
  const [query, setQuery] = useState("");
  const [affordable, setAffordable] = useState(false);
  const [busy, setBusy] = useState<"save" | "play" | null>(null);

  const byId = useMemo(() => new Map(pool.map((t) => [t.accountId, t])), [pool]);
  const picked = [...starters, ...bench].filter((x): x is string => x !== null);
  const spent = picked.reduce((s, id) => s + (byId.get(id)?.price ?? 0), 0);
  const budget = me?.budget ?? 200;
  const bonus = me?.bonus ?? 0;
  const left = budget - spent;
  const full = picked.length === 5;
  const complete = full && captain !== null && starters.includes(captain) && left >= 0;
  const dirty =
    !saved || saved.captainId !== captain || saved.starters.join() !== starters.join() || saved.bench.join() !== bench.join();
  const isOwner = league.ownerMemberId === league.myMemberId;

  // Never let a pick strand the squad: after buying t, the cheapest traders still available must
  // fit the budget for every slot left open.
  const byPrice = useMemo(() => [...pool].sort((a, b) => a.price - b.price), [pool]);
  const reserveAfter = (t: PoolTrader) => {
    const slots = 5 - picked.length - 1;
    let sum = 0;
    let n = 0;
    for (const c of byPrice) {
      if (n === slots) break;
      if (c === t || picked.includes(c.accountId)) continue;
      sum += c.price;
      n++;
    }
    return sum;
  };
  const canAdd = (t: PoolTrader) => !picked.includes(t.accountId) && !full && t.price + reserveAfter(t) <= left;

  function toggle(t: PoolTrader) {
    if (picked.includes(t.accountId)) return remove(t.accountId);
    if (full) return toast.error("Your squad is full. Remove someone first.");
    if (!canAdd(t)) return toast.error(`${t.name} costs ${t.price} credits. With ${left} left you could not fill the rest of your squad.`);
    const si = starters.indexOf(null);
    if (si >= 0) {
      const next = [...starters];
      next[si] = t.accountId;
      setStarters(next);
      if (!captain) setCaptain(t.accountId);
    } else {
      const bi = bench.indexOf(null);
      const next = [...bench];
      next[bi] = t.accountId;
      setBench(next);
    }
  }

  function remove(id: string) {
    setStarters(starters.map((x) => (x === id ? null : x)));
    setBench(bench.map((x) => (x === id ? null : x)));
    if (captain === id) setCaptain(starters.find((x) => x && x !== id) ?? null);
    setSwapFrom(null);
  }

  function swap(role: "starter" | "bench", i: number) {
    if (!swapFrom) return setSwapFrom({ role, i });
    if (swapFrom.role === role && swapFrom.i === i) return setSwapFrom(null);
    const s = [...starters];
    const b = [...bench];
    const get = (r: "starter" | "bench", k: number) => (r === "starter" ? s[k] : b[k]) ?? null;
    const set = (r: "starter" | "bench", k: number, v: Slot) => (r === "starter" ? (s[k] = v) : (b[k] = v));
    const a = get(swapFrom.role, swapFrom.i);
    set(swapFrom.role, swapFrom.i, get(role, i));
    set(role, i, a);
    setStarters(s);
    setBench(b);
    if (captain && !s.includes(captain)) setCaptain(s.find((x) => x) ?? null);
    setSwapFrom(null);
  }

  const body = () => ({ captainId: captain, starters, bench });

  async function save() {
    setBusy("save");
    try {
      onChange(await api.put<LeagueState>(`/leagues/${league.id}/squad`, body()));
      toast.success("Squad saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save your squad");
    } finally {
      setBusy(null);
    }
  }

  async function play() {
    setBusy("play");
    try {
      if (dirty) await api.put<LeagueState>(`/leagues/${league.id}/squad`, body());
      onChange(await api.post<LeagueState>(`/leagues/${league.id}/play`));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not play the week");
      setBusy(null);
    }
  }

  const q = query.trim().toLowerCase();
  const list = pool
    .filter((t) => (style === "all" || t.style === style) && (!q || t.name.toLowerCase().includes(q)) && (!affordable || picked.includes(t.accountId) || canAdd(t)))
    .sort((a, b) => {
      switch (sort) {
        case "priceHigh":
          return b.price - a.price;
        case "priceLow":
          return a.price - b.price;
        case "return":
          return b.prevWeek.returnPct - a.prevWeek.returnPct;
        case "grade":
          return GRADE_ORDER[a.grade] - GRADE_ORDER[b.grade] || b.prevWeek.points - a.prevWeek.points;
        default:
          return b.prevWeek.points - a.prevWeek.points;
      }
    });

  const slotProps = (role: "starter" | "bench", i: number, id: Slot) => ({
    trader: id ? (byId.get(id) ?? null) : null,
    role,
    captain: id !== null && id === captain,
    swapping: swapFrom?.role === role && swapFrom.i === i,
    onOpen: () => id && setOpen(byId.get(id) ?? null),
    onRemove: () => id && remove(id),
    onCaptain: () => id && setCaptain(id),
    onSwap: () => swap(role, i),
  });

  return (
    <div className="grid gap-8 py-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      {/* ── Pitch ─────────────────────────────────────────────── */}
      <section aria-label="Your squad" className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-panel border border-line bg-tile p-5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="t-label">Budget</p>
            <p className="t-small text-fg-mute">
              <span className={cx("t-num text-[22px]", left < 0 ? "text-danger" : "text-fg")}>{left}</span> of {budget} credits left
            </p>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-fill" role="meter" aria-valuemin={0} aria-valuemax={budget} aria-valuenow={spent} aria-label="Budget used">
            <div className={cx("h-full rounded-full", left < 0 ? "bg-danger" : "bg-action")} style={{ width: `${Math.min(100, (spent / budget) * 100)}%` }} />
          </div>
          <p className="t-small mt-3 flex items-center gap-1.5 text-fg-mute">
            <Lightning size={15} weight="fill" className={bonus > 0 ? "text-accent" : ""} aria-hidden />
            {bonus > 0 ? (
              <>
                200 base + <span className="font-semibold text-accent">{bonus} trading bonus</span> for your Strike volume
              </>
            ) : (
              <>
                Trade on Strike to raise your budget: up to +{VOLUME_BONUS_TIERS[0].credits} credits from ${VOLUME_BONUS_TIERS[0].minUsd.toLocaleString("en-US")} a week
              </>
            )}
          </p>
        </div>

        <div className="pitch relative overflow-hidden rounded-panel border border-line px-3 pb-5 pt-6">
          <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 400 300" preserveAspectRatio="none" aria-hidden>
            <g fill="none" stroke="var(--line)" strokeWidth="2">
              <rect x="10" y="10" width="380" height="280" rx="12" />
              <line x1="10" y1="190" x2="390" y2="190" />
              <circle cx="200" cy="190" r="34" />
              <rect x="130" y="10" width="140" height="50" />
            </g>
          </svg>
          <p className="t-label relative mb-4 text-center">Starters</p>
          <div className="relative flex justify-center gap-2 sm:gap-5">{starters.map((id, i) => <PitchSlot key={`s${i}`} {...slotProps("starter", i, id)} />)}</div>
          <p className="t-label relative mb-3 mt-8 text-center">Bench</p>
          <div className="relative flex justify-center gap-2 sm:gap-5">{bench.map((id, i) => <PitchSlot key={`b${i}`} {...slotProps("bench", i, id)} />)}</div>
        </div>
        {swapFrom ? <p className="t-small text-center text-accent">Now tap swap on the slot to trade places with.</p> : null}

        <div className="flex flex-col gap-3">
          {league.replay && isOwner ? (
            <button type="button" className="btn btn-action btn-lg" disabled={!complete || busy !== null} onClick={play}>
              <Play size={18} weight="fill" aria-hidden /> {busy === "play" ? "Kicking off…" : "Save and play the week"}
            </button>
          ) : null}
          <button type="button" className={cx("btn btn-lg", league.replay && isOwner ? "btn-ghost" : "btn-action")} disabled={!complete || !dirty || busy !== null} onClick={save}>
            <FloppyDisk size={18} weight="duotone" aria-hidden /> {busy === "save" ? "Saving…" : !dirty && saved ? "Squad saved" : "Save squad"}
          </button>
          {saved && !dirty && !league.replay ? <BackSquadButton league={league} /> : null}
          <p className="t-small text-center text-fg-mute">
            {!full
              ? `Pick ${5 - picked.length} more trader${5 - picked.length === 1 ? "" : "s"}.`
              : !captain
                ? "Choose a captain with the crown."
                : left < 0
                  ? `You are ${-left} credits over budget.`
                  : league.replay
                    ? isOwner
                      ? "This week already happened. Play it to see how your squad did."
                      : "The league owner plays the week."
                    : "Squads lock at 00:00 UTC on Monday."}
          </p>
        </div>
      </section>

      {/* ── Trader list ───────────────────────────────────────── */}
      <section aria-label="Traders" className="min-w-0">
        <div className="mb-4 flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="relative flex-1">
              <span className="sr-only">Search traders</span>
              <MagnifyingGlass size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-mute" aria-hidden />
              <input id="trader-search" className="field-input w-full !pl-10" placeholder="Search by name or handle" value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
            <label className="sm:w-56">
              <span className="sr-only">Sort by</span>
              <select id="trader-sort" className="field-input w-full" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                {SORTS.map((s) => (
                  <option key={s.key} value={s.key}>
                    Sort: {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by style">
            {STYLES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStyle(s)}
                aria-pressed={style === s}
                className={cx("t-label inline-flex items-center gap-1.5 rounded-chip px-3 py-1.5 text-[11px]", style === s ? "bg-fg text-ground" : "bg-fill text-fg-soft hover:bg-fill-strong")}
              >
                {s === "all" ? null : <StyleIcon style={s} size={12} />}
                {s === "all" ? "All" : STYLE_META[s].label}
              </button>
            ))}
            <label className="t-small ml-auto inline-flex cursor-pointer items-center gap-2 text-fg-mute">
              <input id="affordable" type="checkbox" checked={affordable} onChange={(e) => setAffordable(e.target.checked)} className="accent-[var(--action)]" />
              Only what I can afford
            </label>
          </div>
        </div>

        <div className="overflow-hidden rounded-panel border border-line">
          <div className="t-label hidden grid-cols-[minmax(0,1fr)_56px_64px_72px_64px_92px] gap-3 border-b border-line bg-tile px-4 py-3 text-[10px] md:grid">
            <span>Trader</span>
            <span className="text-center">Grade</span>
            <span className="text-right">Pts</span>
            <span className="text-right">Return</span>
            <span className="text-right">Price</span>
            <span />
          </div>
          <ul className="max-h-[70vh] overflow-y-auto">
            {list.map((t) => {
              const inSquad = picked.includes(t.accountId);
              return (
                <li
                  key={t.accountId}
                  className={cx(
                    "grid cursor-pointer grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-line px-4 py-3 last:border-0 hover:bg-fill md:grid-cols-[minmax(0,1fr)_56px_64px_72px_64px_92px]",
                    inSquad && "bg-accent-soft",
                  )}
                  onClick={() => setOpen(t)}
                >
                  <span className="flex min-w-0 items-center gap-3" style={{ "--card-style": `var(--style-${t.style})` } as React.CSSProperties}>
                    <TraderAvatar accountId={t.accountId} style={t.style} avatarUrl={t.avatarUrl} size={38} />
                    <span className="min-w-0">
                      <span className="t-body block truncate font-semibold">{t.name}</span>
                      <span className="t-label inline-flex items-center gap-1 text-[10px] text-[var(--card-style)]">
                        <StyleIcon style={t.style} size={11} /> {STYLE_META[t.style].label}
                        <span className="text-fg-faint md:hidden"> · {t.prevWeek.points} pts</span>
                      </span>
                    </span>
                  </span>
                  <span className="hidden justify-center md:flex">
                    <GradeBadge grade={t.grade} />
                  </span>
                  <span className="t-num hidden text-right text-[16px] md:block">{t.prevWeek.points}</span>
                  <span className={cx("t-num hidden text-right text-[15px] md:block", t.prevWeek.returnPct < 0 ? "text-danger" : "text-success")}>
                    {t.prevWeek.returnPct > 0 ? "+" : ""}
                    {t.prevWeek.returnPct}%
                  </span>
                  <span className="t-num text-right text-[18px]">
                    <span className="md:hidden">
                      <GradeBadge grade={t.grade} className="mr-2 !h-6 !min-w-8 !text-[12px]" />
                    </span>
                    {t.price}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(t);
                    }}
                    disabled={!inSquad && !canAdd(t)}
                    className={cx("btn btn-sm justify-self-end", inSquad ? "btn-ghost" : "btn-action")}
                    aria-label={inSquad ? `Remove ${t.name}` : `Add ${t.name} for ${t.price} credits`}
                  >
                    {inSquad ? <Check size={15} weight="bold" aria-hidden /> : <Plus size={15} weight="bold" aria-hidden />}
                    <span className="hidden sm:inline">{inSquad ? "Picked" : "Add"}</span>
                  </button>
                </li>
              );
            })}
            {list.length === 0 ? <li className="t-body px-4 py-10 text-center text-fg-mute">No traders match those filters.</li> : null}
          </ul>
        </div>
        <p className="t-small mt-3 text-fg-mute">
          {pool.length} traders, priced and graded on their trading in the week before this league&apos;s week. Tap a trader for details.
        </p>
      </section>

      {open ? (
        <TraderSheet
          trader={open}
          weekId={league.weekId}
          picked={picked.includes(open.accountId)}
          canAdd={canAdd(open)}
          locked={false}
          onToggle={() => toggle(open)}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </div>
  );
}
