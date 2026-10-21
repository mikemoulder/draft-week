import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

export function createDb(url: string) {
  const sql = postgres(url, { max: 10, idle_timeout: 30 });
  return { sql, db: drizzle(sql) };
}

export type Db = ReturnType<typeof createDb>["db"];
