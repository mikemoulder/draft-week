"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, ArrowSquareOut, Crown, HandCoins, StopCircle, Trophy, Wallet } from "@phosphor-icons/react";
import type { HistoryEntry, Profile } from "@draftweek/shared";
import { TraderAvatar } from "@/components/cards/avatar";
import { CHAIN_LABEL, ChainMark } from "@/components/chain-mark";
import { ManagerAvatar } from "@/components/manager-avatar";
import { Container, cx } from "@/components/primitives";
import { useSession } from "@/components/session";
import { ErrorState, toast } from "@/components/states";
import { api } from "@/lib/api";
import { STATUS_LABEL, pts, weekRange } from "@/lib/format";
import { activeCopies, copierFor, existingCopier, type ActiveCopy } from "@/lib/strike-copy";
import { detectWallets, requestEvmWallets, type WalletOption } from "@/lib/wallets";

const STRIKE_APP = "https://app.strikefinance.org";
const short = (s: string) => (s.length > 14 ? `${s.slice(0, 8)}…${s.slice(-5)}` : s);
const money = (n: number) => `${n < 0 ? "−" : n > 0 ? "+" : ""}$${Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;

export default function ProfilePage() {
  const { me, loading } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!loading && !me) router.replace("/signin?next=/profile");
  }, [loading, me, router]);

  useEffect(() => {
    if (!me) return;
    let cancelled = false;
    api
      .get<Profile>("/me/history")
      .then((p) => {
        if (cancelled) return;
        setProfile(p);
        setFailed(false);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [me, attempt]);

  if (loading || !me) {
    return (
      <Container className="py-16">
        <div className="skeleton h-40" />
      </Container>
    );
  }

  const wallet = me.wallets[0];
  const t = profile?.totals;
  return (
    <Container className="py-12 md:py-16">
      <header className="flex flex-col gap-6 border-b border-line pb-8 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-5">
          <span className="relative">
            <ManagerAvatar me={me} size={72} className="ring-2 ring-line-strong" />
            {wallet ? (
              <span className="absolute -bottom-1 -right-1 grid size-7 place-items-center rounded-full bg-panel text-fg-soft ring-2 ring-ground" title={CHAIN_LABEL[wallet.chain]}>
                <ChainMark chain={wallet.chain} size={16} />
              </span>
            ) : null}
          </span>
          <div className="min-w-0">
            <p className="t-label">Manager</p>
            <h1 className="t-display-l mt-1 truncate">{me.displayName}</h1>
            <p className="t-small mt-1 text-fg-mute">
              {wallet ? (
                <>
                  {CHAIN_LABEL[wallet.chain]} · <span className="font-mono">{short(wallet.address)}</span> ·{" "}
                  {me.strike ? <span className="text-success">Strike account linked</span> : "No Strike account"}
                </>
              ) : (
                "Guest. Your leagues live in this browser only."
              )}
            </p>
          </div>
        </div>
        <Link href="/play" className="btn btn-action btn-lg">
          My leagues <ArrowRight size={17} weight="bold" aria-hidden />
        </Link>
      </header>

      {failed ? (
        <div className="py-10">
          <ErrorState title="Your profile did not load" body="The game server did not answer. Nothing is lost." onRetry={() => setAttempt((n) => n + 1)} />
        </div>
      ) : (
        <>
          <section aria-label="Stats" className="grid grid-cols-2 gap-3 py-8 md:grid-cols-4">
            {[
              { k: "Leagues", v: t ? String(t.leagues) : null, note: t ? `${t.finished} finished` : "" },
              { k: "Matchups", v: t ? `${t.wins}–${t.losses}–${t.draws}` : null, note: "won, lost, drawn" },
              { k: "Points", v: t ? pts(t.points) : null, note: "across every league" },
              { k: "Best finish", v: t ? (t.bestRank ? ordinal(t.bestRank) : "–") : null, note: "in a finished week" },
            ].map((s) => (
              <div key={s.k} className="rounded-tile bg-tile p-5">
                <p className="t-label">{s.k}</p>
                {s.v === null ? <div className="skeleton mt-3 h-9 w-20" /> : <p className="t-num mt-2 text-[34px] leading-none">{s.v}</p>}
                <p className="t-small mt-2 text-fg-mute">{s.note}</p>
              </div>
            ))}
          </section>

          <div className="grid gap-10 lg:grid-cols-[7fr_5fr]">
            <section aria-labelledby="history">
              <h2 id="history" className="t-display-m">
                League history
              </h2>
              {profile === null ? (
                <div className="mt-5 flex flex-col gap-2">
                  <div className="skeleton h-20" />
                  <div className="skeleton h-20" />
                </div>
              ) : profile.leagues.length === 0 ? (
                <div className="mt-5 rounded-tile border border-line p-6">
                  <p className="t-title">No leagues yet</p>
                  <p className="t-body mt-2 text-fg-mute">Start one from your leagues page. A finished week plays straight away.</p>
                </div>
              ) : (
                <ul className="mt-5 flex flex-col gap-2">
                  {profile.leagues.map((l) => (
                    <HistoryRow key={l.id} l={l} />
                  ))}
                </ul>
              )}
            </section>

            <aside className="flex flex-col gap-10">
              <Copies />
              <section aria-labelledby="favorites">
                <h2 id="favorites" className="t-label">
                  Most picked
                </h2>
                {profile && profile.favorites.length > 0 ? (
                  <ul className="mt-3 flex flex-col gap-2">
                    {profile.favorites.map((f) => (
                      <li key={f.accountId} className="flex items-center gap-3 rounded-tile bg-tile px-4 py-3">
                        <TraderAvatar accountId={f.accountId} style={f.style} avatarUrl={f.avatarUrl} size={36} />
                        <span className="t-body min-w-0 flex-1 truncate font-semibold">{f.name}</span>
                        <span className="t-small text-fg-mute">
                          {f.picks} league{f.picks === 1 ? "" : "s"}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="t-small mt-3 text-fg-mute">Pick a squad and your favourites show up here.</p>
                )}
              </section>
            </aside>
          </div>
        </>
      )}
    </Container>
  );
}

function ordinal(n: number) {
  const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${s}`;
}

function HistoryRow({ l }: { l: HistoryEntry }) {
  const tone = l.result === "W" ? "bg-success-soft text-success" : l.result === "L" ? "bg-danger-soft text-danger" : "bg-fill text-fg-mute";
  return (
    <li>
      <Link href={`/leagues/${l.id}`} className="grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-tile bg-tile px-4 py-4 hover:bg-fill-strong">
        <span className={cx("t-label grid size-10 place-items-center rounded-[10px] text-[13px]", tone)} title="Matchup result">
          {l.result ?? (l.status === "picking" ? "–" : "·")}
        </span>
        <span className="min-w-0">
          <span className="t-title flex items-center gap-2 truncate">
            {l.name}
            {l.myRank === 1 && l.status === "final" ? <Trophy size={16} weight="fill" className="shrink-0 text-accent" aria-label="Won the league" /> : null}
          </span>
          <span className="t-small block truncate text-fg-mute">
            {weekRange(l.weekId)}
            {l.replay ? " · replay" : ""} · {STATUS_LABEL[l.status]}
            {l.opponent ? ` · v ${l.opponent}` : ""}
            {l.captain ? (
              <>
                {" · "}
                <Crown size={12} weight="fill" className="inline align-[-1px] text-accent" aria-label="Captain" /> {l.captain.name}
              </>
            ) : null}
          </span>
        </span>
        <span className="text-right">
          <span className="t-num block text-[22px] leading-none">{l.myPoints !== null ? pts(l.myPoints) : "–"}</span>
          <span className="t-label text-[10px]">{l.myRank ? `${ordinal(l.myRank)} of ${l.members}` : "pts"}</span>
        </span>
      </Link>
    </li>
  );
}

/** The traders this account copies on Strike, read from Strike, with a stop button each. */
function Copies() {
  const { me } = useSession();
  const strikeId = me?.strike?.accountId ?? null;
  const chain = me?.wallets[0]?.chain ?? null;
  const [copies, setCopies] = useState<ActiveCopy[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [wallets, setWallets] = useState<WalletOption[]>([]);

  const load = useCallback(() => {
    if (!strikeId) return;
    activeCopies(strikeId)
      .then((c) => {
        setCopies(c);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, [strikeId]);

  useEffect(() => {
    const first = setTimeout(load, 0);
    requestEvmWallets();
    const t = setTimeout(() => setWallets(detectWallets().filter((w) => w.chain === chain)), 600);
    return () => {
      clearTimeout(first);
      clearTimeout(t);
    };
  }, [load, chain]);

  async function stop(c: ActiveCopy, option: WalletOption | undefined) {
    if (!strikeId || !chain) return;
    setBusy(c.id);
    try {
      const copier = existingCopier(strikeId) ?? (option ? await copierFor(option, chain, strikeId) : null);
      if (!copier) throw new Error("Open the wallet you signed in with to stop this copy.");
      await copier.stop(c.id);
      toast.success(`Stopped copying ${c.leadName ?? "the trader"}`);
      setConfirm(null);
      load();
    } catch (err) {
      const e = err as { code?: number; message?: string } | null;
      toast.error(e?.code === 4001 || /declin|reject|cancel/i.test(e?.message ?? "") ? "You cancelled the request in your wallet." : (e?.message ?? "Could not stop the copy."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section aria-labelledby="copies">
      <h2 id="copies" className="t-label inline-flex items-center gap-2">
        <HandCoins size={16} weight="duotone" aria-hidden /> Copying on Strike
      </h2>
      {!strikeId ? (
        <p className="t-small mt-3 text-fg-mute">Sign in with the wallet you trade with on Strike to see and manage your copies here.</p>
      ) : failed ? (
        <p className="t-small mt-3 text-fg-mute">
          Strike did not answer.{" "}
          <button type="button" className="text-action underline" onClick={load}>
            Try again
          </button>
        </p>
      ) : copies === null ? (
        <div className="skeleton mt-3 h-20" />
      ) : copies.length === 0 ? (
        <p className="t-small mt-3 text-fg-mute">You are not copying anyone. Copytrade your squad from a league page to copy the traders you picked.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {copies.map((c) => (
            <li key={c.id} className="rounded-tile bg-tile px-4 py-3">
              <div className="flex items-center gap-3">
                <TraderAvatar accountId={c.leadAccountId} style="steady" avatarUrl={c.leadAvatarUrl} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="t-body block truncate font-semibold">{c.leadName ?? short(c.leadAccountId)}</span>
                  <span className="t-small block text-fg-mute">
                    ${c.amount.toLocaleString("en-US")} set aside{c.stopLoss ? ` · stop at −$${c.stopLoss}` : ""} · {c.fills} fill{c.fills === 1 ? "" : "s"}
                  </span>
                </span>
                <span className={cx("t-num text-[16px]", c.pnl < 0 ? "text-danger" : c.pnl > 0 ? "text-success" : "text-fg-mute")}>{money(c.pnl)}</span>
              </div>
              {confirm === c.id ? (
                <div className="mt-3 flex flex-col gap-2 border-t border-line pt-3">
                  <p className="t-small text-fg-soft">Stop copying? Strike closes this copy&apos;s positions at market and releases the money set aside.</p>
                  <div className="flex flex-wrap gap-2">
                    {existingCopier(strikeId) ? (
                      <button type="button" className="btn btn-sm btn-action" disabled={busy !== null} onClick={() => stop(c, undefined)}>
                        <StopCircle size={15} weight="bold" aria-hidden /> {busy === c.id ? "Stopping…" : "Stop copying"}
                      </button>
                    ) : wallets.length === 0 ? (
                      <p className="t-small text-fg-mute">Open the wallet you signed in with, or stop it on Strike.</p>
                    ) : (
                      wallets.map((w) => (
                        <button key={w.id} type="button" className="btn btn-sm btn-action" disabled={busy !== null} onClick={() => stop(c, w)}>
                          <Wallet size={15} weight="duotone" aria-hidden /> {busy === c.id ? "Check your wallet…" : `Stop with ${w.name}`}
                        </button>
                      ))
                    )}
                    <button type="button" className="btn btn-sm btn-ghost" disabled={busy !== null} onClick={() => setConfirm(null)}>
                      Keep copying
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" className="t-small mt-2 inline-flex items-center gap-1 text-fg-mute hover:text-danger" onClick={() => setConfirm(c.id)}>
                  <StopCircle size={14} aria-hidden /> Stop copying
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {strikeId ? (
        <a href={STRIKE_APP} target="_blank" rel="noreferrer" className="t-small mt-3 inline-flex items-center gap-1 text-fg-mute hover:text-fg">
          Everything about your copies is also on Strike <ArrowSquareOut size={13} aria-hidden />
        </a>
      ) : null}
    </section>
  );
}
