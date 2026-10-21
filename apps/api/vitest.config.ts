import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Database tests share one throwaway Postgres and truncate tables, so files run one at a time.
    fileParallelism: false,
  },
});
