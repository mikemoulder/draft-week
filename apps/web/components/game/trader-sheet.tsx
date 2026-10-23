"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { Plus, Skull, Check, X } from "@phosphor-icons/react";
import type { PoolTrader, TraderDetail } from "@draftweek/shared";
import { TraderAvatar } from "@/components/cards/avatar";
import { GradeBadge } from "@/components/cards/grade";
import { StyleIcon } from "@/components/cards/style-icon";
import { cx } from "@/components/primitives";
import { api } from "@/lib/api";
import { money } from "@/lib/format";
import { STYLE_META, TIER_LABEL } from "@/lib/styles";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function ago(ms: number, now: number) {
  const h = Math.round((now - ms) / 3_600_000);
  if (h < 1) return "just now";
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}

export function TraderSheet({
  trader,
  weekId,
  picked,
  canAdd,
  locked,
  onToggle,
  onClose,
}: {
  trader: PoolTrader;
  weekId: string;
  picked: boolean;
  canAdd: boolean;
  locked: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<TraderDetail | null>(null);
  const [now] = useState(() => Date.now());
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<TraderDetail>(`/weeks/${weekId}/traders/${trader.accountId}`)
      .then((d) => !cancelled && setDetail(d))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [weekId, trader.accountId]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const w = trader.prevWeek;
  const maxPts = Math.max(10, ...(detail?.days.map((d) => Math.abs(d.points)) ?? [10]));

  // Portalled to <body> so no transformed or animated ancestor can trap or out-stack the overlay.
  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={`${trader.name}, details`}>
      <button type="button" className="absolute inset-0 bg-[rgb(10_8_20_/_0.6)]" aria-label="Close" onClick={onClose} />
      <aside className="tcard-sheet relative flex h-full w-full max-w-[480px] flex-col overflow-y-auto bg-panel shadow-[var(--elev-pop)]" data-style={trader.style}>
        <div className="flex items-start gap-4 border-b border-line p-6">
          <div className="tcard rounded-full !p-0 !shadow-none" data-style={trader.style} data-tier={trader.tier}>
            <TraderAvatar accountId={trader.accountId} style={trader.style} avatarUrl={trader.avatarUrl} size={64} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="t-display-m truncate">{trader.name}</p>
            <p className="t-small mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-fg-mute">
              <span className="inline-flex items-center gap-1 text-[var(--card-style)]" style={{ "--card-style": `var(--style-${trader.style})` } as React.CSSProperties}>
                <StyleIcon style={trader.style} size={14} /> {STYLE_META[trader.style].label}
              </span>
              <span>
                {TIER_LABEL[trader.tier]} · rated {trader.rating}
              </span>
            </p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} className="grid size-10 place-items-center rounded-full bg-fill hover:bg-fill-strong" aria-label="Close details">
            <X size={18} weight="bold" aria-hidden />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2 border-b border-line p-6 text-center">
          {[
            { k: "Grade", v: <GradeBadge grade={trader.grade} /> },
            { k: "Price", v: <span className="t-num text-[22px]">{trader.price}</span> },
            { k: "Last week", v: <span className="t-num text-[22px]">{w.points} pts</span> },
            { k: "Return", v: <span className={cx("t-num text-[22px]", w.returnPct < 0 ? "text-danger" : "text-success")}>{w.returnPct > 0 ? "+" : ""}{w.returnPct}%</span> },
          ].map((s) => (
            <div key={s.k} className="flex flex-col items-center gap-1.5">
              <span className="t-label text-[10px]">{s.k}</span>
              {s.v}
            </div>
          ))}
        </div>

        <section className="border-b border-line p-6" aria-label="Last week, day by day">
          <h3 className="t-label mb-4">Last week, day by day</h3>
          {detail ? (
            <ol className="grid grid-cols-7 items-end gap-2">
              {DAYS.map((d, i) => {
                const day = detail.days.find((x) => x.day === i);
                const pts = day?.points ?? 0;
                return (
                  <li key={d} className="flex flex-col items-center gap-1.5">
                    <span className={cx("t-num text-[13px]", pts < 0 ? "text-danger" : "")}>{day ? pts : "–"}</span>
                    <span className="flex h-20 w-full items-end overflow-hidden rounded-[6px] bg-fill">
                      <span
                        className={cx("block w-full rounded-[6px]", day?.liquidated ? "bg-danger" : pts > 0 ? "bg-[var(--style-scalper)]" : "bg-fill-strong")}
                        style={{ height: `${Math.max(day ? 6 : 0, (Math.abs(pts) / maxPts) * 100)}%` }}
                      />
                    </span>
                    <span className="t-label text-[10px]">{d}</span>
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className="skeleton h-28" />
          )}
          <p className="t-small mt-4 text-fg-mute">
            {w.trades.toLocaleString("en-US")} trades on {w.activeDays} of 7 days · win rate {w.winRate === null ? "–" : `${Math.round(w.winRate)}%`} · {money(w.pnl)} net
            {w.liquidations > 0 ? ` · ${w.liquidations} liquidation${w.liquidations > 1 ? "s" : ""}` : ""}
          </p>
        </section>

        <section className="flex-1 p-6" aria-label="Latest trades">
          <h3 className="t-label mb-3">Latest trades on Strike</h3>
          {detail === null ? (
            <div className="skeleton h-40" />
          ) : detail.recentFills.length === 0 ? (
            <p className="t-body text-fg-mute">No recent trades.</p>
          ) : (
            <ul className="flex flex-col">
              {detail.recentFills.map((f, i) => (
                <li key={`${f.at}-${i}`} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-line py-2.5 last:border-0">
                  <span className={cx("t-label w-12 rounded-chip px-2 py-1 text-center text-[10px]", f.side === "buy" ? "bg-success-soft text-success" : "bg-danger-soft text-danger")}>{f.side}</span>
                  <span className="t-small min-w-0 truncate">
                    <span className="font-semibold">{f.symbol}</span> <span className="text-fg-mute">· {ago(f.at, now)}</span>
                  </span>
                  <span className={cx("t-num inline-flex items-center gap-1 text-[14px]", f.pnl < 0 ? "text-danger" : f.pnl > 0 ? "text-success" : "text-fg-mute")}>
                    {f.liquidation ? <Skull size={14} weight="fill" aria-label="Liquidation" /> : null}
                    {f.pnl === 0 ? "open" : money(f.pnl)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {!locked ? (
          <div className="sticky bottom-0 border-t border-line bg-panel p-5">
            <button type="button" className={cx("btn btn-lg w-full", picked ? "btn-ghost" : "btn-action")} disabled={!picked && !canAdd} onClick={onToggle}>
              {picked ? (
                <>
                  <Check size={18} weight="bold" aria-hidden /> In your squad, tap to remove
                </>
              ) : (
                <>
                  <Plus size={18} weight="bold" aria-hidden /> {canAdd ? `Add for ${trader.price} credits` : "Not enough budget or squad full"}
                </>
              )}
            </button>
          </div>
        ) : null}
      </aside>
    </div>,
    document.body,
  );
}
