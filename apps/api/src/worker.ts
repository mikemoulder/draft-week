// Ingest loop: every INGEST_INTERVAL_MS pull new Strike fills and recompute points.
// The trader list is refreshed hourly. Runs in its own container next to the API.
import { createDb } from "./db/client.js";
import { runIngest } from "./domain/ingest/run.js";
import { createStrikeClient } from "./strike.js";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");
const intervalMs = Number(process.env.INGEST_INTERVAL_MS ?? 5 * 60_000);
const discoverEveryMs = 60 * 60_000;

const { sql, db } = createDb(url);
const strike = createStrikeClient();
let lastDiscover = 0;
let stopping = false;
let wake: (() => void) | null = null;

async function tick() {
  const now = new Date();
  const discover = now.getTime() - lastDiscover >= discoverEveryMs;
  const started = Date.now();
  try {
    const summary = await runIngest({ db, sql, strike }, { now, discover });
    if (discover && !summary.skipped) lastDiscover = now.getTime();
    console.log(JSON.stringify({ at: now.toISOString(), ms: Date.now() - started, discover, ...summary }));
  } catch (err) {
    console.error(JSON.stringify({ at: now.toISOString(), error: err instanceof Error ? err.message : String(err) }));
  }
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    stopping = true;
    wake?.();
  });
}

while (!stopping) {
  await tick();
  await new Promise<void>((resolve) => {
    wake = resolve;
    setTimeout(resolve, intervalMs);
  });
}
await sql.end({ timeout: 5 });
