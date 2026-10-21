import { serve } from "@hono/node-server";
import { sql as raw } from "drizzle-orm";
import { createApp } from "./app.js";
import { createDb } from "./db/client.js";
import { createAuthService } from "./domain/auth/service.js";
import { lastSuccessfulIngest } from "./domain/ingest/run.js";
import { createLeagueService } from "./domain/leagues/service.js";
import { createShowcase } from "./domain/leagues/showcase.js";
import { loadEnv } from "./env.js";

const env = loadEnv();
const { sql, db } = createDb(env.DATABASE_URL);

const app = createApp({
  proxySecret: env.PROXY_SECRET,
  version: env.GIT_SHA,
  pingDb: async () => {
    try {
      await db.execute(raw`select 1`);
      return true;
    } catch {
      return false;
    }
  },
  lastIngestAt: () => lastSuccessfulIngest(db),
  auth: createAuthService(db, { origin: env.WEB_ORIGIN }),
  secureCookie: env.WEB_ORIGIN.startsWith("https://"),
  db,
  leagues: createLeagueService(db),
  showcase: createShowcase(db),
});

const server = serve({ fetch: app.fetch, port: env.PORT, hostname: "0.0.0.0" }, (info) => {
  console.log(`api listening on :${info.port} (${env.GIT_SHA})`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close();
    void sql.end({ timeout: 5 }).finally(() => process.exit(0));
  });
}
