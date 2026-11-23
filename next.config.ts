import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  output: "standalone",
  poweredByHeader: false,
  // Keep pg outside the bundle; queries run in pg-sync-worker.mjs via worker_threads.
  serverExternalPackages: ["pg"],
  images: {
    localPatterns: [{ pathname: "/media/**" }],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  /**
   * Rewrites (not redirects): browser URL stays /owner/... while App Router
   * serves the existing /admin tree. Physical /admin still works.
   * Case typos (/Admin) are handled in src/proxy.ts — never add them here
   * (case-insensitive matching can loop /admin → /admin).
   */
  async rewrites() {
    return [
      { source: "/owner", destination: "/admin" },
      { source: "/owner/:path*", destination: "/admin/:path*" },
      { source: "/control-center", destination: "/admin" },
      { source: "/control-center/:path*", destination: "/admin/:path*" },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
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
