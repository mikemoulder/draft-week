"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowSquareOut, Check, CheckCircle, Copy, HandCoins, Wallet, WarningCircle, X } from "@phosphor-icons/react";
import type { LeagueState } from "@draftweek/shared";
import { TraderAvatar } from "@/components/cards/avatar";
import { StyleIcon } from "@/components/cards/style-icon";
import { cx } from "@/components/primitives";
import { useSession } from "@/components/session";
import { BUILDER_CODE, copierFor, copierState, copyLimits, StrikeError, type CopyLimits } from "@/lib/strike-copy";
import { STYLE_META } from "@/lib/styles";
import { detectWallets, requestEvmWallets, type WalletOption } from "@/lib/wallets";

const STRIKE_APP = "https://app.strikefinance.org";

type RowState = { state: "copying" | "done" | "already" | "failed"; note?: string };

/** The button that opens "Back your squad". Renders nothing until FTL has a builder code. */
export function BackSquadButton({ league, className }: { league: LeagueState; className?: string }) {
  const [open, setOpen] = useState(false);
  const squad = league.squads.find((s) => s.memberId === league.myMemberId);
  if (!BUILDER_CODE || !squad) return null;
  return (
    <>
      <button type="button" className={cx("btn btn-ghost btn-lg", className)} onClick={() => setOpen(true)}>
        <HandCoins size={18} weight="duotone" aria-hidden /> Back your squad on Strike
      </button>
      {open ? <BackSquadSheet league={league} ids={[...squad.starters, ...squad.bench]} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function BackSquadSheet({ league, ids, onClose }: { league: LeagueState; ids: string[]; onClose: () => void }) {
  const { me } = useSession();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [limits, setLimits] = useState<CopyLimits | null>(null);
  const [state, setState] = useState<{ available: number; copying: Set<string> } | null>(null);
  const [wallets, setWallets] = useState<WalletOption[]>([]);
  const [chosen, setChosen] = useState<Set<string>>(() => new Set(ids));
  const [amount, setAmount] = useState(25);
  const [stopLoss, setStopLoss] = useState(10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<string, RowState>>({});

  const strikeId = me?.strike?.accountId ?? null;
  const chain = me?.wallets[0]?.chain ?? null;

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, busy]);

  useEffect(() => {
    let cancelled = false;
    copyLimits()
      .then((l) => {
        if (cancelled) return;
        setLimits(l);
        setAmount((a) => Math.max(a, l.minAmount));
      })
      .catch(() => undefined);
    if (strikeId) {
      copierState(strikeId)
        .then((s) => {
          if (cancelled) return;
          setState(s);
          setChosen((c) => new Set([...c].filter((id) => !s.copying.has(id))));
        })
        .catch(() => undefined);
    }
    requestEvmWallets();
    const t = setTimeout(() => !cancelled && setWallets(detectWallets().filter((w) => w.chain === chain)), 600);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [strikeId, chain]);

  const trader = (id: string) => league.traders.find((t) => t.accountId === id);
  const picked = ids.filter((id) => chosen.has(id));
  const total = picked.length * amount;
  const min = limits?.minAmount ?? 20;
  const finished = picked.length > 0 && picked.every((id) => rows[id]?.state === "done" || rows[id]?.state === "already");
  const problem =
    amount < min
      ? `Strike's minimum is $${min} per trader.`
      : stopLoss < 0 || stopLoss > amount
        ? "Set a stop-loss between $0 and the amount per trader."
        : state && total > state.available
          ? `That sets aside $${total}, and your Strike account has $${Math.floor(state.available)} available.`
          : null;

  async function back(option: WalletOption) {
    if (!strikeId || !chain) return;
    setBusy(true);
    setError(null);
    try {
      const copier = await copierFor(option, chain, strikeId);
      for (const id of picked) {
        if (rows[id]?.state === "done") continue;
        setRows((r) => ({ ...r, [id]: { state: "copying" } }));
        try {
          await copier.subscribe(id, { amount, stopLoss });
          setRows((r) => ({ ...r, [id]: { state: "done" } }));
        } catch (err) {
          const already = err instanceof StrikeError && err.status === 409 && /already/i.test(err.message);
          setRows((r) => ({ ...r, [id]: already ? { state: "already" } : { state: "failed", note: err instanceof Error ? err.message : "Strike refused this copy." } }));
        }
      }
    } catch (err) {
      const e = err as { code?: number; message?: string } | null;
      setError(e?.code === 4001 || /declin|reject|cancel/i.test(e?.message ?? "") ? "You cancelled the request in your wallet." : (e?.message ?? "Something went wrong."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Back your squad">
      <button type="button" className="absolute inset-0 bg-[rgb(10_8_20_/_0.6)]" aria-label="Close" onClick={() => !busy && onClose()} />
      <aside className="relative flex h-full w-full max-w-[480px] flex-col overflow-y-auto bg-panel shadow-[var(--elev-pop)]">
        <div className="flex items-start gap-4 border-b border-line p-6">
          <HandCoins size={36} weight="duotone" className="mt-1 text-accent" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="t-display-m">Back your squad</p>
            <p className="t-small mt-1 text-fg-mute">Copy your picks with Strike&apos;s own copy trading. Their next trades open in your Strike account, scaled to the amount you set.</p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} disabled={busy} className="grid size-10 shrink-0 place-items-center rounded-full bg-fill hover:bg-fill-strong" aria-label="Close">
            <X size={18} weight="bold" aria-hidden />
          </button>
        </div>

        {!strikeId ? (
          <div className="flex flex-col gap-4 p-6">
            <WarningCircle size={32} weight="duotone" className="text-warning" aria-hidden />
            <p className="t-body">
              {me && me.wallets.length === 0
                ? "Guests cannot copy traders. Sign in with the wallet you use on Strike."
                : "Your wallet has no Strike account yet. Create one with the same wallet, add funds, then come back."}
            </p>
            <a href={me && me.wallets.length === 0 ? "/signin" : STRIKE_APP} target={me && me.wallets.length === 0 ? undefined : "_blank"} rel="noreferrer" className="btn btn-action btn-lg">
              {me && me.wallets.length === 0 ? "Sign in with a wallet" : "Open Strike"}
              {me && me.wallets.length === 0 ? null : <ArrowSquareOut size={17} weight="bold" aria-hidden />}
            </a>
          </div>
        ) : (
          <>
            <section className="border-b border-line p-6" aria-label="Traders to copy">
              <h3 className="t-label mb-3">Your squad</h3>
              <ul className="flex flex-col gap-1.5">
                {ids.map((id) => {
                  const t = trader(id);
                  const row = rows[id];
                  const already = state?.copying.has(id) ?? false;
                  return (
                    <li key={id}>
                      <label className={cx("flex items-center gap-3 rounded-tile px-3 py-2.5", already ? "opacity-70" : "cursor-pointer hover:bg-fill")}>
                        <input
                          type="checkbox"
                          className="size-4 accent-[var(--accent)]"
                          checked={chosen.has(id)}
                          disabled={already || busy || row?.state === "done"}
                          onChange={(e) => setChosen((c) => (e.target.checked ? new Set([...c, id]) : new Set([...c].filter((x) => x !== id))))}
                        />
                        <TraderAvatar accountId={id} style={t?.style ?? "steady"} avatarUrl={t?.avatarUrl ?? null} size={36} />
                        <span className="min-w-0 flex-1">
                          <span className="t-body block truncate font-semibold">{t?.name ?? id.slice(0, 8)}</span>
                          {t ? (
                            <span className="t-label inline-flex items-center gap-1 text-[10px]" style={{ color: `var(--style-${t.style})` }}>
                              <StyleIcon style={t.style} size={11} /> {STYLE_META[t.style].label}
                            </span>
                          ) : null}
                        </span>
                        <RowBadge row={row} already={already} />
                      </label>
                      {row?.state === "failed" ? <p className="t-small px-3 pb-1 text-danger">{row.note}</p> : null}
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="grid grid-cols-2 gap-4 border-b border-line p-6" aria-label="Limits">
              <MoneyField label="Amount per trader" value={amount} onChange={setAmount} disabled={busy} hint={`Minimum $${min}. Set aside while copying.`} />
              <MoneyField label="Stop-loss per trader" value={stopLoss} onChange={setStopLoss} disabled={busy} hint="The copy ends when its loss reaches this." />
              <p className="t-small col-span-2 text-fg-mute">
                {picked.length} trader{picked.length === 1 ? "" : "s"} × ${amount} = <span className="font-semibold text-fg">${total}</span> set aside
                {state ? ` · $${Math.floor(state.available).toLocaleString("en-US")} available on Strike` : ""}
              </p>
            </section>

            <section className="flex-1 p-6" aria-label="How it works">
              <ul className="t-small flex flex-col gap-2 text-fg-mute">
                <li>Only trades after you start are copied. Each copy uses at most the amount you set as margin.</li>
                <li>FTL charges nothing. When you stop a winning copy, Strike pays the trader {Math.round((limits?.profitShare ?? 0.1) * 100)}% of your profit.</li>
                <li>Losses can run past the stop-loss in a fast market. Copy only what you can afford to lose.</li>
                <li>Your wallet signs once to give this tab a key that can start copies. The key never leaves this tab, and FTL never sees it.</li>
              </ul>
            </section>

            <div className="sticky bottom-0 flex flex-col gap-3 border-t border-line bg-panel p-5">
              {error ? (
                <p role="alert" className="t-small rounded-tile border border-danger bg-danger-soft p-3 text-danger">
                  {error}
                </p>
              ) : null}
              {finished ? (
                <a href={STRIKE_APP} target="_blank" rel="noreferrer" className="btn btn-action btn-lg">
                  Manage your copies on Strike <ArrowSquareOut size={17} weight="bold" aria-hidden />
                </a>
              ) : wallets.length === 0 ? (
                <p className="t-small text-center text-fg-mute">Open the wallet you signed in with to continue.</p>
              ) : (
                wallets.map((w) => (
                  <button key={w.id} type="button" className="btn btn-action btn-lg" disabled={busy || picked.length === 0 || problem !== null} onClick={() => back(w)}>
                    <Wallet size={18} weight="duotone" aria-hidden />
                    {busy ? "Check your wallet…" : `Copy ${picked.length} trader${picked.length === 1 ? "" : "s"} with ${w.name}`}
                  </button>
                ))
              )}
              {problem && !finished ? <p className="t-small text-center text-warning">{problem}</p> : null}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

function RowBadge({ row, already }: { row?: RowState; already: boolean }) {
  if (already || row?.state === "already")
    return (
      <span className="t-label inline-flex items-center gap-1 text-[10px] text-success">
        <CheckCircle size={14} weight="fill" aria-hidden /> Copying
      </span>
    );
  if (row?.state === "done")
    return (
      <span className="t-label inline-flex items-center gap-1 text-[10px] text-success">
        <Check size={14} weight="bold" aria-hidden /> Started
      </span>
    );
  if (row?.state === "copying")
    return (
      <span className="t-label inline-flex items-center gap-1 text-[10px] text-fg-mute">
        <Copy size={14} aria-hidden /> Starting…
      </span>
    );
  if (row?.state === "failed")
    return (
      <span className="t-label inline-flex items-center gap-1 text-[10px] text-danger">
        <WarningCircle size={14} weight="fill" aria-hidden /> Refused
      </span>
    );
  return null;
}

function MoneyField({ label, value, onChange, hint, disabled }: { label: string; value: number; onChange: (n: number) => void; hint: string; disabled: boolean }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="t-label text-[10px]">{label}</span>
      <span className="relative">
        <span className="t-num absolute left-3 top-1/2 -translate-y-1/2 text-fg-mute">$</span>
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step={5}
          value={Number.isFinite(value) ? value : ""}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="t-num h-11 w-full rounded-button border border-line bg-tile pl-7 pr-3 text-[18px] outline-none focus-visible:border-line-strong"
        />
      </span>
      <span className="t-small text-fg-mute">{hint}</span>
    </label>
  );
}
