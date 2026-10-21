import { useId } from "react";
import type { TraderStyle } from "@draftweek/shared";

// A club crest generated from the account id: the trader's style color, one of five patterns and a
// jersey number. Deterministic, so a trader always wears the same crest. No photos, no AI art.

const STYLE_COLOR: Record<TraderStyle, string> = {
  degen: "#FF5C8A",
  scalper: "#5CC8FF",
  swing: "#3DDC97",
  steady: "#B794FF",
};
const SECONDARY = ["#FFF6EA", "#23173B", "#FFC93C", "#FF7A3D"];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const SHIELD = "M50 3 L93 15 V55 C93 84 74 102 50 113 C26 102 7 84 7 55 V15 Z";

export function crestOf(accountId: string, style: TraderStyle) {
  const h = hash(accountId);
  const primary = STYLE_COLOR[style];
  const secondary = SECONDARY[h % SECONDARY.length] as string;
  return { primary, secondary: secondary === primary ? "#FFF6EA" : secondary, pattern: (h >>> 4) % 5, number: 1 + ((h >>> 9) % 99) };
}

export function Crest({ accountId, style, size = 64, className }: { accountId: string; style: TraderStyle; size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  const { primary, secondary, pattern, number } = crestOf(accountId, style);
  return (
    <svg viewBox="0 0 100 116" width={size} height={size * 1.16} className={className} aria-hidden>
      <defs>
        <clipPath id={`c${id}`}>
          <path d={SHIELD} />
        </clipPath>
      </defs>
      <g clipPath={`url(#c${id})`}>
        <rect width="100" height="116" fill={primary} />
        {pattern === 1 ? [20, 50, 80].map((x) => <rect key={x} x={x - 7} width="14" height="116" fill={secondary} />) : null}
        {pattern === 2 ? [30, 62, 94].map((y) => <rect key={y} y={y - 8} width="100" height="16" fill={secondary} />) : null}
        {pattern === 3 ? <path d="M-10 30 L30 -10 L110 70 L70 110 Z" fill={secondary} /> : null}
        {pattern === 4 ? <rect x="50" width="50" height="116" fill={secondary} /> : null}
      </g>
      <path d={SHIELD} fill="none" stroke="#15112A" strokeOpacity="0.35" strokeWidth="3" />
      <circle cx="50" cy="60" r="21" fill="#FFF6EA" stroke="#15112A" strokeOpacity="0.25" strokeWidth="2" />
      <text
        x="50"
        y="61"
        textAnchor="middle"
        dominantBaseline="central"
        fill="#15112A"
        style={{ font: "800 24px var(--font-display)", letterSpacing: "-0.04em" }}
      >
        {number}
      </text>
    </svg>
  );
}
