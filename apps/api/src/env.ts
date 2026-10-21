import { z } from "zod";

// Fail at boot, not at the first request, when the environment is incomplete.
const Env = z.object({
  DATABASE_URL: z.string().url(),
  PROXY_SECRET: z.string().min(32),
  WEB_ORIGIN: z.string().url(),
  PORT: z.coerce.number().default(3940),
  GIT_SHA: z.string().default("dev"),
});

export type Env = z.infer<typeof Env>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = Env.safeParse(source);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`invalid environment: ${missing}`);
  }
  return parsed.data;
}
