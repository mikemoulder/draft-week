// Bundles the API and the ingest worker. Workspace packages (@draftweek/shared) are
// bundled in; everything in dependencies stays external and is installed in the image.
import { build } from "esbuild";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));
const external = Object.keys(pkg.dependencies).filter((d) => !d.startsWith("@draftweek/"));

await build({
  entryPoints: ["src/server.ts", "src/migrate.ts", "src/worker.ts"],
  outdir: "dist",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  sourcemap: true,
  external,
  logLevel: "info",
});
