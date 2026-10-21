import { Hono } from "hono";
import type { Db } from "../db/client.js";
import { draftPool, playableWeeks } from "../domain/traders/pool.js";
import { isWeekId } from "../domain/scoring/weeks.js";
import type { AppEnv } from "../http.js";

export function weekRoutes(db: Db, now: () => Date = () => new Date()) {
  const r = new Hono<AppEnv>();

  r.get("/weeks", async (c) => c.json(await playableWeeks(db, now())));

  r.get("/weeks/:id/pool", async (c) => {
    const id = c.req.param("id");
    if (!isWeekId(id)) return c.json({ error: "week id must be a Monday, e.g. 2026-10-12" }, 400);
    return c.json(await draftPool(db, id));
  });

  return r;
}
