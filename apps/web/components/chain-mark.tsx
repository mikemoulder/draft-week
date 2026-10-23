import type { Chain } from "@draftweek/shared";

export const CHAIN_LABEL: Record<Chain, string> = { cardano: "Cardano", ethereum: "Ethereum", solana: "Solana" };

/** Simple marks for the three networks Strike accounts live on. Drawn, not copied, and single colour. */
export function ChainMark({ chain, size = 28, className }: { chain: Chain; size?: number; className?: string }) {
  if (chain === "ethereum")
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden>
        <path d="M16 3 8 16.4l8 4.8 8-4.8z" fill="currentColor" opacity="0.95" />
        <path d="M16 22.8 8 18l8 11 8-11z" fill="currentColor" opacity="0.65" />
      </svg>
    );
  if (chain === "solana")
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden>
        <path d="M9 8h17l-3 3.6H6z M6 14.2h17l3 3.6H9z M9 20.4h17l-3 3.6H6z" fill="currentColor" />
      </svg>
    );
  // Cardano: a ring of dots around a centre, the way its mark reads at small sizes.
  const ring = (r: number, n: number, d: number, offset = 0) =>
    Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2 + offset;
      return <circle key={`${r}-${i}`} cx={16 + r * Math.cos(a)} cy={16 + r * Math.sin(a)} r={d} fill="currentColor" />;
    });
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden>
      {ring(5.2, 6, 1.9)}
      {ring(10, 6, 1.4, Math.PI / 6)}
      {ring(13.6, 6, 0.9)}
    </svg>
  );
}
