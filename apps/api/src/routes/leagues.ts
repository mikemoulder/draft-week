import { Hono, type Context, type MiddlewareHandler } from "hono";
import { CreateLeagueRequest, JoinLeagueRequest, SquadRequest } from "@draftweek/shared";
import type { LeagueService, Viewer } from "../domain/leagues/service.js";
import type { Result } from "../domain/result.js";
import { body, isUuid, requireMe, type AppEnv } from "../http.js";

const viewer = (c: Context<AppEnv>): Viewer => {
  const me = c.get("me");
  if (!me) throw new Error("requireMe must run first");
  return { userId: me.id, displayName: me.displayName };
};

const reply = <T>(c: Context<AppEnv>, r: Result<T>) => (r.ok ? c.json(r.value as object) : c.json({ error: r.error }, r.status));

export function leagueRoutes(leagues: LeagueService) {
  const r = new Hono<AppEnv>();
  r.use("/leagues", requireMe);
  r.use("/leagues/*", requireMe);
  r.use("/me/history", requireMe);
  // Only the routes that take a league id. A wildcard here would also catch /leagues/join.
  const leagueId: MiddlewareHandler<AppEnv> = async (c, next) => (isUuid(c.req.param("id") ?? "") ? next() : c.json({ error: "league not found" }, 404));

  r.get("/leagues", async (c) => c.json(await leagues.mine(viewer(c))));
  r.get("/me/history", async (c) => c.json(await leagues.profile(viewer(c))));
  r.post("/leagues", body(CreateLeagueRequest), async (c) => reply(c, await leagues.create(viewer(c), c.req.valid("json"))));
  r.post("/leagues/join", body(JoinLeagueRequest), async (c) => reply(c, await leagues.join(viewer(c), c.req.valid("json").inviteCode)));

  r.get("/leagues/:id", leagueId, async (c) => reply(c, await leagues.state(c.req.param("id"), viewer(c))));
  r.put("/leagues/:id/squad", leagueId, body(SquadRequest), async (c) => reply(c, await leagues.setSquad(viewer(c), c.req.param("id"), c.req.valid("json"))));
  r.post("/leagues/:id/play", leagueId, async (c) => reply(c, await leagues.play(viewer(c), c.req.param("id"))));

  return r;
}
