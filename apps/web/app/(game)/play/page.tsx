"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LockKey } from "@phosphor-icons/react";
import { MAX_LEAGUE_SIZE, MIN_LEAGUE_SIZE, type LeagueState, type LeagueSummary, type WeekInfo } from "@draftweek/shared";
import { Container, cx } from "@/components/primitives";
import { useSession } from "@/components/session";
import { ErrorState, toast } from "@/components/states";
import { api } from "@/lib/api";
import { STATUS_LABEL, WEEK_NOTE, pts, weekRange } from "@/lib/format";

function StatusChip({ status }: { status: LeagueSummary["status"] }) {
  return (
    <span className="t-label inline-flex items-center gap-2 border border-line px-2 py-1 text-fg-soft">
      {status === "live" ? <span className="live-dot" aria-hidden /> : null}
      {STATUS_LABEL[status]}
    </span>
  );
}

/** The id of the week (its Monday, UTC) that contains `at`. */
function mondayOf(at: Date): string {
  const d = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

function CreateLeague({ weeks, defaultName, onCancel }: { weeks: WeekInfo[]; defaultName: string; onCancel: () => void }) {
  const router = useRouter();
  const [name, setName] = useState(defaultName);
  const [size, setSize] = useState(MIN_LEAGUE_SIZE);
  const sizeOk = Number.isInteger(size) && size >= MIN_LEAGUE_SIZE && size <= MAX_LEAGUE_SIZE;
  const [weekId, setWeekId] = useState(weeks.find((w) => w.status === "final")?.id ?? weeks[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  // The week in progress is never playable (no hindsight picks), but it is listed so its absence makes sense.
  const [current] = useState(() => mondayOf(new Date()));
  const rows = [...weeks, ...(weeks.some((w) => w.id === current) ? [] : [{ id: current } as WeekInfo])].sort((a, b) => a.id.localeCompare(b.id));

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const league = await api.post<LeagueState>("/leagues", { name, weekId, size });
      toast.success("League created");
      router.push(`/leagues/${league.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create the league");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={create} className="border border-line-strong bg-panel p-5 shadow-pop md:p-8">
      <p className="t-label">New league</p>
      <label className="mt-5 block">
        <span className="t-label">Name</span>
        <input
          id="league-name"
          className="field-input mt-2 w-full"
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
        />
      </label>
      <label className="mt-6 block">
        <span className="t-label">Max managers</span>
        <span className="mt-2 flex flex-wrap items-center gap-4">
          <input
            id="league-size"
            type="number"
            inputMode="numeric"
            className="field-input t-num w-28"
            value={Number.isFinite(size) ? size : ""}
            min={MIN_LEAGUE_SIZE}
            max={MAX_LEAGUE_SIZE}
            step={1}
            onChange={(e) => setSize(Number(e.target.value))}
            required
          />
          <span className={cx("t-small", sizeOk ? "text-fg-mute" : "text-warning")}>
            {sizeOk
              ? `Up to ${size - 1} ${size - 1 === 1 ? "friend" : "friends"} can join. If fewer than ${MIN_LEAGUE_SIZE} play, bots make up the numbers.`
              : `A number from ${MIN_LEAGUE_SIZE} to ${MAX_LEAGUE_SIZE}. Raise it for an event.`}
          </span>
        </span>
      </label>
      <fieldset className="mt-6">
        <legend className="t-label">Week</legend>
        <div className="mt-2 border-t border-line">
          {rows.map((w) =>
            w.id === current && !weeks.some((x) => x.id === current) ? (
              <div key={w.id} className="flex gap-4 border-b border-line px-1 py-4 opacity-80" aria-disabled="true">
                <LockKey size={18} weight="duotone" className="mt-1 shrink-0 text-fg-mute" aria-hidden />
                <span className="flex-1">
                  <span className="t-title block">
                    {weekRange(w.id)} <span className="t-label ml-1 rounded-chip bg-fill px-2 py-0.5 align-middle text-[10px]">This week</span>
                  </span>
                  <span className="t-small block text-fg-mute">
                    Picks closed at kick-off on Monday. Its results are already coming in, so picking now would be picking with hindsight.
                    Replay a finished week now, or pick for next week and watch it live.
                  </span>
                </span>
                <span className="t-label shrink-0">Locked</span>
              </div>
            ) : (
            <label key={w.id} className={cx("flex cursor-pointer gap-4 border-b border-line px-1 py-4", weekId === w.id && "bg-fill")}>
              <input type="radio" name="week" value={w.id} checked={weekId === w.id} onChange={() => setWeekId(w.id)} className="mt-1 accent-[var(--fg)]" />
              <span className="flex-1">
                <span className="t-title block">{weekRange(w.id)}</span>
                <span className="t-small block text-fg-mute">{WEEK_NOTE[w.status]}</span>
              </span>
              <span className="t-label shrink-0">{w.draftable} traders</span>
            </label>
            ),
          )}
        </div>
      </fieldset>
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="submit" className="btn btn-action" disabled={busy || !weekId || !sizeOk}>
          {busy ? "Creating…" : "Create league"}
        </button>
        <button type="button" className="btn btn-text" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function JoinLeague() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  async function join(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const league = await api.post<LeagueState>("/leagues/join", { inviteCode: code });
      router.push(`/leagues/${league.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not join");
      setBusy(false);
    }
  }
  return (
    <form onSubmit={join} className="flex flex-col gap-3 sm:flex-row">
      <label className="flex-1">
        <span className="sr-only">Invite code</span>
        <input
          id="invite-code"
          className="field-input w-full font-mono uppercase tracking-[0.12em]"
          placeholder="Invite code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          minLength={4}
          maxLength={16}
          required
        />
      </label>
      <button type="submit" className="btn btn-ghost" disabled={busy}>
        {busy ? "Joining…" : "Join league"}
      </button>
    </form>
  );
}

export default function PlayPage() {
  const { me, loading } = useSession();
  const router = useRouter();
  const [leagues, setLeagues] = useState<LeagueSummary[] | null>(null);
  const [weeks, setWeeks] = useState<WeekInfo[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [creating, setCreating] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!loading && !me) router.replace("/signin?next=/play");
  }, [loading, me, router]);

  useEffect(() => {
    if (!me) return;
    let cancelled = false;
    Promise.all([api.get<LeagueSummary[]>("/leagues"), api.get<WeekInfo[]>("/weeks")])
      .then(([l, w]) => {
        if (cancelled) return;
        setLeagues(l);
        setWeeks(w);
        setFailed(false);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [me, attempt]);

  if (loading || !me) return <Container className="py-16"><div className="skeleton h-40" /></Container>;

  return (
    <Container className="py-12 md:py-16">
      <div className="flex flex-col gap-6 border-b border-line-strong pb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="t-label">Signed in as {me.displayName}</p>
          <h1 className="t-display-l mt-3">Your leagues</h1>
        </div>
        {!creating ? (
          <button type="button" className="btn btn-action btn-lg" onClick={() => setCreating(true)} disabled={!weeks}>
            Start a league
          </button>
        ) : null}
      </div>

      {failed ? (
        <div className="py-10">
          <ErrorState title="Your leagues did not load" body="The game server did not answer. Your leagues are safe." onRetry={() => setAttempt((n) => n + 1)} />
        </div>
      ) : (
        <div className="grid gap-12 py-10 lg:grid-cols-[7fr_5fr]">
          <section aria-label="Leagues">
            {creating && weeks ? (
              <div className="mb-10">
                <CreateLeague weeks={weeks} defaultName={`${me.displayName.split(" ")[0] ?? "My"}'s league`} onCancel={() => setCreating(false)} />
              </div>
            ) : null}
            {leagues === null ? (
              <div className="flex flex-col gap-2">
                <div className="skeleton h-16" />
                <div className="skeleton h-16" />
              </div>
            ) : leagues.length === 0 ? (
              <div className="border border-line p-6 md:p-8">
                <p className="t-title">No leagues yet</p>
                <p className="t-body mt-2 max-w-[52ch] text-fg-mute">
                  Start one on last week to draft and play the whole week right now, or join a friend&apos;s league with their invite code.
                </p>
              </div>
            ) : (
              <ul className="border-t border-line">
                {leagues.map((l) => (
                  <li key={l.id}>
                    <Link href={`/leagues/${l.id}`} className="grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-2 border-b border-line px-1 py-5 hover:bg-fill md:grid-cols-[1fr_auto_auto_auto]">
                      <span className="min-w-0">
                        <span className="t-title block truncate">{l.name}</span>
                        <span className="t-small block text-fg-mute">
                          {weekRange(l.weekId)} · {l.members} managers
                        </span>
                      </span>
                      <StatusChip status={l.status} />
                      <span className="t-label hidden md:block">{l.myRank ? `Rank ${l.myRank}` : ""}</span>
                      <span className="t-num hidden text-[22px] md:block">{l.myPoints !== null ? pts(l.myPoints) : "–"}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <aside className="flex flex-col gap-4">
            <p className="t-label">Got an invite code</p>
            <JoinLeague />
            <p className="t-small text-fg-mute">Ask a friend for the code on their league page. You can join until the week kicks off, and bots fill any empty seats.</p>
          </aside>
        </div>
      )}
    </Container>
  );
}
