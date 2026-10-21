import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // packages/shared ships TypeScript source
  transpilePackages: ["@draftweek/shared"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
