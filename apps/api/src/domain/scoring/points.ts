// Daily trader points, version 1. Validated on the week to 2026-10-21: rank scoring gave 50% close
// games against 13% for raw returns, where a single liquidation decided the game on day one.
export const SCORING_VERSION = 1;
export const LIQUIDATION_PENALTY = 5;
export const MIN_EQUITY = 100;

export type DayStat = {
  accountId: string;
  pnl: number; // realized pnl minus fees, USD
  trades: number;
  liquidations: number;
  equityRef: number; // equity going into the day
};

/**
 * Every trader who traded that day is ranked by return (pnl / equity) against all other traders
 * who traded that day, and scores 1..10 by decile. No trades scores 0. Any liquidation costs 5.
 */
export function scoreDay(stats: DayStat[]): Map<string, number> {
  const points = new Map<string, number>();
  const active = stats
    .filter((s) => s.trades > 0)
    .map((s) => ({ ...s, ret: s.pnl / Math.max(s.equityRef, MIN_EQUITY) }))
    // accountId breaks ties so a rerun always produces the same points
    .sort((a, b) => a.ret - b.ret || a.accountId.localeCompare(b.accountId));

  for (const s of stats) points.set(s.accountId, 0);
  active.forEach((s, i) => {
    const decile = 1 + Math.floor((10 * i) / active.length);
    points.set(s.accountId, decile - (s.liquidations > 0 ? LIQUIDATION_PENALTY : 0));
  });
  return points;
}
