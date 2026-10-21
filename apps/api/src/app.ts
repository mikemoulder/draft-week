import { timingSafeEqual } from "node:crypto";
import { Hono } from "hono";
import type { Health } from "@draftweek/shared";

export type AppDeps = {
  proxySecret: string;
  version: string;
  pingDb: () => Promise<boolean>;
  lastIngestAt: () => Promise<number | null>;
};

function sameSecret(given: string | undefined, expected: string): boolean {
  if (!given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createApp(deps: AppDeps) {
  const app = new Hono();

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

  app.notFound((c) => c.json({ error: "not found" }, 404));
  app.onError((err, c) => {
    console.error(err);
    return c.json({ error: "internal error" }, 500);
  });

  return app;
}
