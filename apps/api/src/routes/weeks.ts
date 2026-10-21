import { Hono } from "hono";
import type { Db } from "../db/client.js";
import { draftPool, playableWeeks } from "../domain/traders/pool.js";
import { isWeekId } from "../domain/scoring/weeks.js";
import type { AppEnv } from "../http.js";
import type { ShowcaseService } from "../domain/leagues/showcase.js";

export function weekRoutes(db: Db, now: () => Date = () => new Date(), showcase?: ShowcaseService) {
  const r = new Hono<AppEnv>();

  r.get("/showcase", async (c) => {
    const s = showcase ? await showcase.get() : null;
    return s ? c.json(s) : c.json({ error: "no finished week to show yet" }, 404);
  });

  r.get("/weeks", async (c) => c.json(await playableWeeks(db, now())));

  r.get("/weeks/:id/pool", async (c) => {
    const id = c.req.param("id");
    if (!isWeekId(id)) return c.json({ error: "week id must be a Monday, e.g. 2026-10-12" }, 400);
    return c.json(await draftPool(db, id));
  });

  return r;
}
