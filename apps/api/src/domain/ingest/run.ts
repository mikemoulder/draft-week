import { and, desc, gt, isNotNull, isNull, eq } from "drizzle-orm";
import type postgres from "postgres";
import type { Db } from "../../db/client.js";
import { ingestRuns, traders } from "../../db/schema.js";
import type { StrikeClient } from "../../strike.js";
import { DAY_MS, addWeeks, weekBounds, weekIdOf } from "../scoring/weeks.js";
import { discoverTraders } from "./discover.js";
import { ingestTraderFills, recordFillsError } from "./fills.js";
import { recomputeWeek } from "./recompute.js";

// Any constant works; it only has to be the same in every process that runs ingest.
const LOCK_KEY = 7_340_211;
const CONCURRENCY = 4;
const ACTIVE_WITHIN_MS = 2 * DAY_MS;

export type IngestDeps = { db: Db; sql: postgres.Sql; strike: StrikeClient };
export type IngestSummary =
  | { skipped: true }
  | { skipped: false; traders: number; inserted: number; weeks: string[]; errors: number };

async function pool<T>(items: T[], size: number, fn: (item: T) => Promise<void>) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) await fn(items[next++] as T);
    }),
  );
}

/**
 * One ingest pass: optionally refresh the trader list, pull new fills for every recently seen
 * trader, then recompute points for each week the new fills landed in (and the current week).
 * Backfill reaches back to the start of the week before last, so the most recent finished week
 * has its pool (previous week's stats) available.
 */
export async function runIngest(deps: IngestDeps, opts: { now: Date; discover: boolean }): Promise<IngestSummary> {
  const conn = await deps.sql.reserve();
  try {
    const [lock] = await conn<{ locked: boolean }[]>`select pg_try_advisory_lock(${LOCK_KEY}) as locked`;
    if (!lock?.locked) return { skipped: true };

    const [run] = await deps.db.insert(ingestRuns).values({ startedAt: opts.now }).returning({ id: ingestRuns.id });
    const runId = run?.id as number;
    try {
      if (opts.discover) await discoverTraders(deps.db, deps.strike, opts.now);

      const recent = await deps.db
        .select({ accountId: traders.accountId })
        .from(traders)
        .where(and(eq(traders.optedOut, false), gt(traders.updatedAt, new Date(opts.now.getTime() - ACTIVE_WITHIN_MS))));

      const currentWeek = weekIdOf(opts.now);
      const backfillFrom = weekBounds(addWeeks(currentWeek, -2)).start;
      const weeks = new Set<string>([currentWeek]);
      let inserted = 0;
      let errors = 0;

      await pool(recent, CONCURRENCY, async ({ accountId }) => {
        try {
          const r = await ingestTraderFills(deps.db, deps.strike, accountId, backfillFrom);
          inserted += r.inserted;
          if (r.inserted > 0 && r.minTs !== null && r.maxTs !== null) {
            for (let t = r.minTs; t <= r.maxTs; t += DAY_MS) weeks.add(weekIdOf(new Date(t)));
            weeks.add(weekIdOf(new Date(r.maxTs)));
          }
        } catch (err) {
          errors++;
          await recordFillsError(deps.db, accountId, err instanceof Error ? err.message : String(err));
        }
      });

      for (const w of weeks) await recomputeWeek(deps.db, w);

      await deps.db
        .update(ingestRuns)
        .set({ finishedAt: new Date(), traders: recent.length, fillsInserted: inserted })
        .where(eq(ingestRuns.id, runId));
      return { skipped: false, traders: recent.length, inserted, weeks: [...weeks].sort(), errors };
    } catch (err) {
      await deps.db
        .update(ingestRuns)
        .set({ finishedAt: new Date(), error: err instanceof Error ? err.message : String(err) })
        .where(eq(ingestRuns.id, runId));
      throw err;
    }
  } finally {
    await conn`select pg_advisory_unlock(${LOCK_KEY})`.catch(() => undefined);
    conn.release();
  }
}

export async function lastSuccessfulIngest(db: Db): Promise<number | null> {
  const [row] = await db
    .select({ at: ingestRuns.finishedAt })
    .from(ingestRuns)
    .where(and(isNotNull(ingestRuns.finishedAt), isNull(ingestRuns.error)))
    .orderBy(desc(ingestRuns.finishedAt))
    .limit(1);
  return row?.at ? row.at.getTime() : null;
}
