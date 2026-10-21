import Link from "next/link";

/** FTL wordmark: a sunset badge with the letters, then the full name as a label. */
export function Logo() {
  return (
    <Link href="/" className="group flex items-center gap-3" aria-label="FTL, Fantasy Trading League, home">
      <span className="grid h-9 place-items-center rounded-[12px] bg-[linear-gradient(135deg,#ff5c8a,#ff7a3d_55%,#ffc93c)] px-2.5 shadow-[0_3px_0_#b3471a] transition-transform group-hover:-rotate-3">
        <span className="t-num text-[17px] tracking-[-0.03em] text-[#1a0b02]">FTL</span>
      </span>
      <span className="t-label hidden text-fg-mute sm:inline">Fantasy Trading League</span>
    </Link>
  );
}
