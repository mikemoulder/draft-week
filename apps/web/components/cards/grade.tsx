import type { Grade } from "@draftweek/shared";
import { cx } from "@/components/primitives";

const TONE: Record<Grade, string> = {
  "A+": "bg-accent text-ground",
  A: "bg-[var(--style-swing)] text-ground",
  B: "bg-[var(--style-scalper)] text-ground",
  C: "bg-[var(--style-steady)] text-ground",
  D: "bg-fill-strong text-fg-soft",
};

/** Profitability grade from last week's return. */
export function GradeBadge({ grade, className }: { grade: Grade; className?: string }) {
  return (
    <span className={cx("t-num inline-grid h-7 min-w-9 place-items-center rounded-[9px] px-1.5 text-[14px]", TONE[grade], className)} title={`Grade ${grade}: last week's return`}>
      {grade}
    </span>
  );
}
