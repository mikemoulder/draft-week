import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // packages/shared ships TypeScript source
  transpilePackages: ["@draftweek/shared"],
  // Trader avatars uploaded to Strike. Only Strike's own image host.
  images: { remotePatterns: [{ protocol: "https", hostname: "prod-images.strikefinance.org" }] },
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
