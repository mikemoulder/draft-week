import { existsSync } from "node:fs";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createDb } from "./db/client.js";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");

const folder = process.env.MIGRATIONS_DIR ?? "drizzle";
const { sql, db } = createDb(url);

if (existsSync(folder)) {
  await migrate(db, { migrationsFolder: folder });
  console.log(`migrations applied from ${folder}`);
} else {
  console.log(`no migrations folder at ${folder}, nothing to apply`);
}
await sql.end();
