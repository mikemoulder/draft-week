import { timingSafeEqual } from "node:crypto";
import { Hono } from "hono";
import type { Health } from "@draftweek/shared";
import type { AuthService } from "./domain/auth/service.js";
import { session, type AppEnv } from "./http.js";
import type { LeagueService } from "./domain/leagues/service.js";
import { leagueRoutes } from "./routes/leagues.js";
import { authRoutes } from "./routes/auth.js";
import { weekRoutes } from "./routes/weeks.js";
import type { Db } from "./db/client.js";

export type AppDeps = {
  proxySecret: string;
  version: string;
  pingDb: () => Promise<boolean>;
  lastIngestAt: () => Promise<number | null>;
  auth?: AuthService;
  db?: Db;
  leagues?: LeagueService;
  now?: () => Date;
  secureCookie?: boolean;
};

function sameSecret(given: string | undefined, expected: string): boolean {
  if (!given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createApp(deps: AppDeps) {
  const app = new Hono<AppEnv>();

  // Only the web app's proxy knows this secret, so the public API hostname cannot be
  // used to bypass the web origin. /health stays open for uptime checks.
  app.use("*", async (c, next) => {
    if (c.req.path === "/health") return next();
    if (!sameSecret(c.req.header("x-proxy-secret"), deps.proxySecret)) {
      return c.json({ error: "forbidden" }, 403);
    }
    return next();
  });

  app.get("/health", async (c) => {
    const db = await deps.pingDb();
    const body: Health = {
      ok: db,
      db,
      lastIngestAt: db ? await deps.lastIngestAt() : null,
      version: deps.version,
    };
    return c.json(body, db ? 200 : 503);
  });

  if (deps.auth) {
    app.use("*", session(deps.auth));
    app.route("/", authRoutes(deps.auth, { secureCookie: deps.secureCookie ?? true }));
  }
  if (deps.db) app.route("/", weekRoutes(deps.db, deps.now));
  if (deps.leagues) app.route("/", leagueRoutes(deps.leagues));

  app.notFound((c) => c.json({ error: "not found" }, 404));
  app.onError((err, c) => {
    console.error(err);
    return c.json({ error: "internal error" }, 500);
  });

  return app;
}
