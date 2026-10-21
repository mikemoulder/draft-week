import type { Context, MiddlewareHandler } from "hono";
import { getCookie } from "hono/cookie";
import type { ZodType } from "zod";
import { zValidator } from "@hono/zod-validator";
import type { Me } from "@draftweek/shared";
import type { AuthService } from "./domain/auth/service.js";
import { SESSION_COOKIE } from "./domain/auth/sessions.js";

export type AppEnv = { Variables: { me: Me | null } };

// Validation failures answer in the same { error } shape as every other API error.
export function body<T extends ZodType>(schema: T) {
  return zValidator("json", schema, (result, c: Context) => {
    if (!result.success) {
      const issue = result.error.issues[0];
      const where = issue?.path.length ? `${issue.path.join(".")}: ` : "";
      return c.json({ error: `${where}${issue?.message ?? "invalid request"}` }, 400);
    }
  });
}

/** Resolve the session cookie once per request; routes read c.var.me. */
export function session(auth: AuthService): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const token = getCookie(c, SESSION_COOKIE);
    c.set("me", token ? await auth.userForToken(token) : null);
    await next();
  };
}

/** Routes that need a signed-in user. */
export const requireMe: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (!c.get("me")) return c.json({ error: "sign in first" }, 401);
  await next();
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s: string) => UUID.test(s);
