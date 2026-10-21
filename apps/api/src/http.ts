import type { Context } from "hono";
import type { ZodType } from "zod";
import { zValidator } from "@hono/zod-validator";
import type { Me } from "@draftweek/shared";

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
