import Link from "next/link";

/**
 * The FTL mark: a hand of three trader cards fanned on the action-orange tile, the middle card
 * raised with an up arrow. Same drawing as app/icon.svg. Side cards use the scalper and swing colors.
 */
export function LogoMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden>
      <rect x="2" y="5" width="60" height="57" rx="16" fill="#B3471A" />
      <rect x="2" y="2" width="60" height="57" rx="16" fill="#FF7A3D" />
      <g transform="translate(32 56)" stroke="#15112A" strokeWidth="3" strokeLinejoin="round">
        <g className="logo-card-l">
          <rect x="-10" y="-44" width="20" height="28" rx="4" fill="#5CC8FF" transform="rotate(-30)" />
        </g>
        <g className="logo-card-r">
          <rect x="-10" y="-44" width="20" height="28" rx="4" fill="#3DDC97" transform="rotate(30)" />
        </g>
        <rect x="-11" y="-48" width="22" height="31" rx="4.5" fill="#FFF4E6" />
        <path d="M-6 -29.5 L0 -38.5 L6 -29.5 Z" fill="#FF7A3D" strokeWidth="2.5" />
      </g>
    </svg>
  );
}

/** The mark, the letters, then the full name as a label. */
export function Logo() {
  return (
    <Link href="/" className="logo group flex items-center gap-2.5" aria-label="FTL, Fantasy Trading League, home">
      <LogoMark size={38} className="transition-transform duration-300 group-hover:-rotate-6" />
      <span className="t-num text-[22px] leading-none tracking-[-0.03em]">FTL</span>
      <span className="t-label hidden pl-1 text-fg-mute sm:inline">Fantasy Trading League</span>
    </Link>
  );
}
