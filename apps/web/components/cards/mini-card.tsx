import type { CardTrader } from "./trader-card";
import { cx } from "@/components/primitives";
import { Crest } from "./crest";
import { StyleIcon } from "./style-icon";

/** One-line card for hands, boards and lists: crest, name, style, rating. */
export function MiniCard({ trader, className, right }: { trader: CardTrader; className?: string; right?: React.ReactNode }) {
  return (
    <div className={cx("tcard rounded-[16px] !p-[2px]", className)} data-tier={trader.tier} data-style={trader.style}>
      <div className="tcard-inner flex items-center gap-3 !rounded-[14px] px-3 py-2">
        <Crest accountId={trader.accountId} style={trader.style} size={30} />
        <div className="min-w-0 flex-1">
          <p className="t-small truncate font-semibold">{trader.name}</p>
          <p className="t-label flex items-center gap-1 text-[10px] text-[var(--card-style)]">
            <StyleIcon style={trader.style} size={11} /> {trader.style}
          </p>
        </div>
        {right ?? <span className="t-num text-[20px]">{trader.rating}</span>}
      </div>
    </div>
  );
}
