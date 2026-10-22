import { Hono, type Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { ChallengeRequest, StrikeAccountsRequest, VerifyRequest } from "@draftweek/shared";
import type { AuthService } from "../domain/auth/service.js";
import { SESSION_COOKIE, SESSION_TTL_MS } from "../domain/auth/sessions.js";
import { body, type AppEnv } from "../http.js";

export function authRoutes(auth: AuthService, opts: { secureCookie: boolean }) {
  const r = new Hono<AppEnv>();

  r.post("/auth/challenge", body(ChallengeRequest), async (c) => {
    const { chain, address } = c.req.valid("json");
    const result = await auth.challenge(chain, address);
    return result.ok ? c.json(result.value) : c.json({ error: result.error }, result.status);
  });

  const startSession = (c: Context<AppEnv>, token: string) =>
    setCookie(c, SESSION_COOKIE, token, {
      httpOnly: true,
      secure: opts.secureCookie,
      sameSite: "Lax",
      path: "/",
      maxAge: SESSION_TTL_MS / 1000,
    });

  r.post("/auth/verify", body(VerifyRequest), async (c) => {
    const { nonce, signature, key } = c.req.valid("json");
    const result = await auth.verify(nonce, signature, key);
    if (!result.ok) return c.json({ error: result.error }, result.status);
    startSession(c, result.value.token);
    return c.json(result.value.me);
  });

  // Public: which of a wallet's addresses already have a Strike account. Strike's own data is public.
  r.post("/strike/accounts", body(StrikeAccountsRequest), async (c) => {
    const { chain, addresses } = c.req.valid("json");
    return c.json(await auth.strikeAccounts(chain, addresses));
  });

  r.post("/auth/guest", async (c) => {
    const { token, me } = await auth.guest();
    startSession(c, token);
    return c.json(me);
  });

  r.post("/auth/logout", async (c) => {
    const token = getCookie(c, SESSION_COOKIE);
    if (token) await auth.revoke(token);
    deleteCookie(c, SESSION_COOKIE, { path: "/", secure: opts.secureCookie });
    return c.body(null, 204);
  });

  // "Who am I": null when signed out. Not an error, so signed-out pages keep a clean console.
  r.get("/me", (c) => c.json(c.get("me")));

  return r;
}
