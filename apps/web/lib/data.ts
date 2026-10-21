/* Seed data + the swap seam: src/lib/data.ts
 *
 * THE most important file in a hackathon frontend.
 *
 * Phase 3 builds every screen against SEED. Phase 4 flips one flag. If the
 * backend never lands, the demo still runs; if it lands, nothing visual moves.
 * This is also what makes CONFIG demo.offline_safe true.
 *
 * Rules for seed data:
 *   - Plausible. Judges read it. A placeholder name says you did not think about
 *     the problem; a realistic row says you did.
 *   - Include the ugly cases: a very long name, a zero, a failure, a null.
 *     If the layout survives your seed, it survives the demo.
 *   - Enough rows to look alive (6-12), never so many it looks generated.
 */

export type Item = {
  id: string;
  title: string;
  summary: string;
  status: "active" | "pending" | "failed";
  score: number;
  updatedAt: string;
};

export const SEED: Item[] = [
  {
    id: "itm_01",
    title: "Riverside Elementary HVAC retrofit",
    summary: "Flagged for a 34% overrun against the district's Q3 baseline.",
    status: "active",
    score: 92,
    updatedAt: "2026-08-18T14:20:00Z",
  },
  {
    id: "itm_02",
    title: "Northgate Transit Authority procurement review",
    summary: "Three bids, one vendor, same registered address. Needs a human.",
    status: "pending",
    score: 78,
    updatedAt: "2026-08-18T11:05:00Z",
  },
  {
    id: "itm_03",
    title: "Municipal Water Board: quarterly reconciliation and variance report",
    // ^ deliberately long: proves the card truncates instead of breaking
    summary: "Reconciled clean. No action required.",
    status: "active",
    score: 100,
    updatedAt: "2026-08-17T09:40:00Z",
  },
  {
    id: "itm_04",
    title: "Parks & Recreation capital plan",
    summary: "Ingest failed. The source document was a scanned fax.",
    status: "failed",
    score: 0, // ^ deliberately zero: proves the score UI handles it
    updatedAt: "2026-08-16T22:15:00Z",
  },
];

/* ── The seam ──────────────────────────────────────────────────────────────
 * One flag. Set NEXT_PUBLIC_USE_SEED=1 to force fake data. Do this for the
 * live demo even when the API works, if demo.offline_safe is true.
 *
 * Note the fallback on failure: the demo NEVER shows an error because the
 * backend is down. It silently serves seed and keeps going.
 */
const USE_SEED = process.env.NEXT_PUBLIC_USE_SEED === "1";

export async function getItems(): Promise<Item[]> {
  if (USE_SEED) return delay(SEED, 350); // fake latency so skeletons are visible

  try {
    const res = await fetch("/api/items", { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as Item[];
    return data.length ? data : SEED;
  } catch {
    if (process.env.NODE_ENV !== "production") console.warn("api down, using seed");
    return SEED;
  }
}

/* Fake latency is a feature: with 0ms the skeleton never renders and you
 * cannot tell whether you built it. 300-400ms also *feels* like real work
 * happening, which reads better on stage than an instant flash. */
function delay<T>(value: T, ms: number): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}
