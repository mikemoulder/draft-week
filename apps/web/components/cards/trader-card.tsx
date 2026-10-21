import { Skull } from "@phosphor-icons/react/dist/ssr";
import type { PoolTrader } from "@draftweek/shared";
import { cx } from "@/components/primitives";
import { STYLE_META, TIER_LABEL } from "@/lib/styles";
import { Crest } from "./crest";
import { StyleIcon } from "./style-icon";

export type CardTrader = Pick<PoolTrader, "accountId" | "name" | "style" | "rating" | "tier" | "prevWeek">;

/** The collectible card for one trader, rated on last week. The signature of the product. */
export function TraderCard({ trader, tilt = 0, className, footer }: { trader: CardTrader; tilt?: number; className?: string; footer?: React.ReactNode }) {
  const w = trader.prevWeek;
  return (
    <article
      className={cx("tcard w-[208px] shrink-0", className)}
      data-tier={trader.tier}
      data-style={trader.style}
      style={tilt ? { transform: `rotate(${tilt}deg)` } : undefined}
      aria-label={`${trader.name}, rated ${trader.rating}, ${TIER_LABEL[trader.tier]} ${STYLE_META[trader.style].label}`}
    >
      <div className="tcard-inner flex h-full flex-col gap-3 p-4">
        <div className="flex items-start justify-between">
          <div className="leading-none">
            <p className="t-num text-[38px] leading-[0.85]">{trader.rating}</p>
            <p className="t-label mt-1 text-fg-mute">{TIER_LABEL[trader.tier]}</p>
          </div>
          <span className="t-label inline-flex items-center gap-1.5 rounded-chip bg-[color-mix(in_oklab,var(--card-style)_22%,transparent)] px-2.5 py-1 text-[var(--card-style)]">
            <StyleIcon style={trader.style} size={13} />
            {STYLE_META[trader.style].label}
          </span>
        </div>
        <Crest accountId={trader.accountId} style={trader.style} size={76} className="mx-auto drop-shadow-[0_8px_14px_rgb(0_0_0_/_0.45)]" />
        <p className="t-title truncate text-center text-[17px]">{trader.name}</p>
        <dl className="grid grid-cols-3 gap-1 rounded-tile bg-fill p-2 text-center">
          <div>
            <dt className="t-label text-[10px] text-fg-faint">Pts</dt>
            <dd className="t-num text-[17px]">{w.points}</dd>
          </div>
          <div>
            <dt className="t-label text-[10px] text-fg-faint">Win</dt>
            <dd className="t-num text-[17px]">{w.winRate === null ? "–" : `${Math.round(w.winRate)}%`}</dd>
          </div>
          <div>
            <dt className="t-label text-[10px] text-fg-faint">Days</dt>
            <dd className="t-num text-[17px]">{w.activeDays}/7</dd>
          </div>
        </dl>
        {footer ?? (
          <p className="t-small flex items-center justify-center gap-1.5 text-fg-mute">
            {w.liquidations > 0 ? (
              <>
                <Skull size={14} weight="fill" className="text-danger" aria-hidden />
                {w.liquidations} liquidation{w.liquidations > 1 ? "s" : ""} last week
              </>
            ) : (
              <>{w.trades.toLocaleString("en-US")} trades last week</>
            )}
          </p>
        )}
      </div>
    </article>
  );
}
